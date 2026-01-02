from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import false, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_db
from app.models import Author, Book, Genre, Review, Tag
from app.schemas.book import BookOut

router = APIRouter(prefix="/books", tags=["books"])


def _book_with_stats_stmt():
    return (
        select(
            Book,
            func.avg(Review.rating).filter(Review.is_hidden == False).label("rating_avg"),  # noqa: E712
            func.count(Review.id).filter(Review.is_hidden == False).label("rating_count"),  # noqa: E712
        )
        .outerjoin(Review, Review.book_id == Book.id)
        .group_by(Book.id)
    )


@router.get("", response_model=list[BookOut])
def list_books(
    q: str | None = Query(default=None, description="Search in book title"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = _book_with_stats_stmt().order_by(Book.id.desc()).limit(limit).offset(offset)

    if q:
        stmt = (
            _book_with_stats_stmt()
            .where(Book.title.ilike(f"%{q}%"))
            .order_by(Book.id.desc())
            .limit(limit)
            .offset(offset)
        )

    rows = db.execute(stmt).all()
    out: list[BookOut] = []
    for book, rating_avg, rating_count in rows:
        book.rating_avg = float(rating_avg) if rating_avg is not None else None
        book.rating_count = int(rating_count or 0)
        out.append(book)
    return out


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    stmt = _book_with_stats_stmt().where(Book.id == book_id)
    row = db.execute(stmt).first()
    if not row:
        raise HTTPException(status_code=404, detail="Book not found")

    book, rating_avg, rating_count = row
    book.rating_avg = float(rating_avg) if rating_avg is not None else None
    book.rating_count = int(rating_count or 0)
    return book


def _score_candidate(book: Book, author_ids: set[int], tag_ids: set[int], genre_ids: set[int]) -> float:
    score = 0.0
    if any(a.id in author_ids for a in (book.authors or [])):
        score += 3.0
    score += sum(1.0 for t in (book.tags or []) if t.id in tag_ids)
    score += sum(1.0 for g in (book.genres or []) if g.id in genre_ids)
    score += (book.rating_avg or 0.0) / 5.0
    return score


@router.get("/{book_id}/similar", response_model=list[dict])
def similar_books(
    book_id: int,
    limit: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    seed = db.get(Book, book_id)
    if not seed:
        raise HTTPException(status_code=404, detail="Book not found")

    author_ids = {a.id for a in (seed.authors or [])}
    tag_ids = {t.id for t in (seed.tags or [])}
    genre_ids = {g.id for g in (seed.genres or [])}

    if not author_ids and not tag_ids and not genre_ids:
        return []

    stmt = (
        _book_with_stats_stmt()
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

    rows = db.execute(stmt).all()
    candidates: list[Book] = []
    for book, rating_avg, rating_count in rows:
        book.rating_avg = float(rating_avg) if rating_avg is not None else None
        book.rating_count = int(rating_count or 0)
        candidates.append(book)

    scored = [(b, _score_candidate(b, author_ids, tag_ids, genre_ids)) for b in candidates]
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
