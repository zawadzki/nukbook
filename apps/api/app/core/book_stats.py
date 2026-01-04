from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.engine import Row

from app.models import Book, Review


def book_with_stats_stmt():
    return (
        select(
            Book,
            func.avg(Review.rating).filter(Review.is_hidden == False).label("rating_avg"),  # noqa: E712
            func.count(Review.id).filter(Review.is_hidden == False).label("rating_count"),  # noqa: E712
        )
        .outerjoin(Review, Review.book_id == Book.id)
        .group_by(Book.id)
    )


def hydrate_books(rows: Iterable[tuple[Book, float | None, int | None] | Row[Any]]) -> list[Book]:
    out: list[Book] = []
    for row in rows:
        book, rating_avg, rating_count = row
        book.rating_avg = float(rating_avg) if rating_avg is not None else None
        book.rating_count = int(rating_count or 0)
        out.append(book)
    return out
