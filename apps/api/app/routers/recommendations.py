from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, Query
from sqlalchemy import false, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_current_user, get_db
from app.models import (
    Author,
    Book,
    Genre,
    Review,
    Shelf,
    Tag,
    User,
    shelf_books,
)
from app.schemas.book import BookOut

router = APIRouter(prefix="/me/recommendations", tags=["recommendations"])


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


def _hydrate_books(rows: Iterable[tuple[Book, float | None, int | None]]) -> list[Book]:
    out: list[Book] = []
    for book, rating_avg, rating_count in rows:
        book.rating_avg = float(rating_avg) if rating_avg is not None else None
        book.rating_count = int(rating_count or 0)
        out.append(book)
    return out


def _liked_books(db: Session, user: User) -> list[Book]:
    stmt = (
        select(Book)
        .join(shelf_books, shelf_books.c.book_id == Book.id)
        .join(Shelf, Shelf.id == shelf_books.c.shelf_id)
        .join(
            Review,
            (Review.book_id == Book.id)
            & (Review.user_id == user.id)
            & (Review.rating >= 4)
            & (Review.is_hidden == False),  # noqa: E712
        )
        .where(Shelf.user_id == user.id)
        .where(Shelf.name == "read")
        .order_by(Review.updated_at.desc())
        .options(selectinload(Book.authors), selectinload(Book.tags), selectinload(Book.genres))
    )
    return list(db.execute(stmt).scalars().all())


def _excluded_books_subquery(user_id: int):
    return (
        select(shelf_books.c.book_id)
        .join(Shelf, Shelf.id == shelf_books.c.shelf_id)
        .where(Shelf.user_id == user_id)
    )


def _score_candidate(book: Book, author_ids: set[int], tag_ids: set[int], genre_ids: set[int]) -> float:
    score = 0.0
    if any(a.id in author_ids for a in (book.authors or [])):
        score += 3.0
    score += sum(1.0 for t in (book.tags or []) if t.id in tag_ids)
    score += sum(1.0 for g in (book.genres or []) if g.id in genre_ids)
    score += (book.rating_avg or 0.0) / 5.0
    return score


def _recommend_for_book(db: Session, user: User, seed: Book, limit: int) -> list[Book]:
    author_ids = {a.id for a in (seed.authors or [])}
    tag_ids = {t.id for t in (seed.tags or [])}
    genre_ids = {g.id for g in (seed.genres or [])}

    if not author_ids and not tag_ids and not genre_ids:
        return []

    excluded = _excluded_books_subquery(user.id)
    stmt = (
        _book_with_stats_stmt()
        .where(Book.id.notin_(excluded))
        .where(Book.id != seed.id)
        .where(
            or_(
                Book.authors.any(Author.id.in_(author_ids)) if author_ids else false(),
                Book.tags.any(Tag.id.in_(tag_ids)) if tag_ids else false(),
                Book.genres.any(Genre.id.in_(genre_ids)) if genre_ids else false(),
            )
        )
        .options(selectinload(Book.authors), selectinload(Book.tags), selectinload(Book.genres))
        .limit(50)
    )

    candidates = _hydrate_books(db.execute(stmt).all())
    scored = [(b, _score_candidate(b, author_ids, tag_ids, genre_ids)) for b in candidates]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [b for (b, _) in scored[:limit]]


@router.get("/sections")
def recommendation_sections(
    sections: int = Query(default=3, ge=1, le=6),
    per: int = Query(default=3, ge=1, le=8),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    liked = _liked_books(db, user)
    liked = liked[:sections]

    out = []
    for seed in liked:
        items = _recommend_for_book(db, user, seed, per)
        out.append({"seed": BookOut.model_validate(seed), "items": [BookOut.model_validate(b) for b in items]})

    return out


@router.get("")
def recommendation_list(
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    liked = _liked_books(db, user)
    if not liked:
        return []

    scored: dict[int, tuple[Book, float]] = {}

    for seed in liked:
        candidates = _recommend_for_book(db, user, seed, limit=50)
        author_ids = {a.id for a in (seed.authors or [])}
        tag_ids = {t.id for t in (seed.tags or [])}
        genre_ids = {g.id for g in (seed.genres or [])}

        for b in candidates:
            score = _score_candidate(b, author_ids, tag_ids, genre_ids)
            if b.id not in scored or score > scored[b.id][1]:
                scored[b.id] = (b, score)

    ordered = sorted(scored.values(), key=lambda x: x[1], reverse=True)
    page = ordered[offset : offset + limit]
    return [BookOut.model_validate(b) for (b, _) in page]
