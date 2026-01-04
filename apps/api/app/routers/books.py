from fastapi import APIRouter, Depends, HTTPException, Query
from typing import cast
from sqlalchemy import false, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.book_stats import book_with_stats_stmt, hydrate_books
from app.core.recommendations import has_traits, score_candidate, seed_traits
from app.deps import get_db
from app.models import Author, Book, Genre, Tag
from app.schemas.book import BookOut

router = APIRouter(prefix="/books", tags=["books"])


@router.get("", response_model=list[BookOut])
def list_books(
    q: str | None = Query(default=None, description="Search in book title"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = book_with_stats_stmt().order_by(Book.id.desc()).limit(limit).offset(offset)

    if q:
        stmt = (
            book_with_stats_stmt()
            .where(Book.title.ilike(f"%{q}%"))
            .order_by(Book.id.desc())
            .limit(limit)
            .offset(offset)
        )

    return hydrate_books(db.execute(stmt).all())


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    stmt = book_with_stats_stmt().where(Book.id == book_id)
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Book not found")

    return hydrate_books([row])[0]


@router.get("/{book_id}/similar", response_model=list[dict])
def similar_books(
    book_id: int,
    limit: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    seed = cast(Book | None, db.get(Book, book_id))
    if seed is None:
        raise HTTPException(status_code=404, detail="Book not found")

    author_ids, tag_ids, genre_ids = seed_traits(seed)
    if not has_traits(author_ids, tag_ids, genre_ids):
        return []

    stmt = (
        book_with_stats_stmt()
        .where(Book.id != seed.id)
        .where(
            or_(
                Book.authors.any(Author.id.in_(author_ids)) if author_ids else false(),
                Book.tags.any(Tag.id.in_(tag_ids)) if tag_ids else false(),
                Book.genres.any(Genre.id.in_(genre_ids)) if genre_ids else false(),
            )
        )
        .options(selectinload(Book.authors), selectinload(Book.tags), selectinload(Book.genres))
        .limit(60)
    )

    candidates = hydrate_books(db.execute(stmt).all())
    scored = [(b, score_candidate(b, author_ids, tag_ids, genre_ids)) for b in candidates]
    scored.sort(key=lambda x: x[1], reverse=True)

    out = []
    for b, _ in scored[:limit]:
        reasons = []
        if author_ids and any(a.id in author_ids for a in (b.authors or [])):
            reasons.append("Same author")
        if genre_ids and any(g.id in genre_ids for g in (b.genres or [])):
            reasons.append("Same genre")
        if tag_ids and any(t.id in tag_ids for t in (b.tags or [])):
            reasons.append("Similar tags")
        if b.rating_avg is not None and b.rating_avg >= 4.0:
            reasons.append("Highly rated")

        out.append(
            {
                "book": BookOut.model_validate(b),
                "reasons": reasons,
            }
        )
    return out
