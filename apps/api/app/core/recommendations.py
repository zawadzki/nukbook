from __future__ import annotations

from app.models import Book


def score_candidate(book: Book, author_ids: set[int], tag_ids: set[int], genre_ids: set[int]) -> float:
    score = 0.0
    if any(a.id in author_ids for a in (book.authors or [])):
        score += 3.0
    score += sum(1.0 for t in (book.tags or []) if t.id in tag_ids)
    score += sum(1.0 for g in (book.genres or []) if g.id in genre_ids)
    score += (book.rating_avg or 0.0) / 5.0
    return score


def seed_traits(seed: Book) -> tuple[set[int], set[int], set[int]]:
    author_ids = {a.id for a in (seed.authors or [])}
    tag_ids = {t.id for t in (seed.tags or [])}
    genre_ids = {g.id for g in (seed.genres or [])}
    return author_ids, tag_ids, genre_ids


def has_traits(author_ids: set[int], tag_ids: set[int], genre_ids: set[int]) -> bool:
    return bool(author_ids or tag_ids or genre_ids)
