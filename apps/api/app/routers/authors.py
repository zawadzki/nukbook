from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Author, AuthorLike, Book, Review, User
from app.schemas.author import AuthorLikeIn, AuthorOut, AuthorTopOut
from app.schemas.book import BookOut

router = APIRouter(prefix="/authors", tags=["authors"])


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


@router.get("", response_model=list[AuthorOut])
def list_authors(
    q: str | None = Query(default=None, description="Search in author name"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Author).order_by(Author.id.desc()).limit(limit).offset(offset)
    if q:
        stmt = select(Author).where(Author.name.ilike(f"%{q}%")).order_by(Author.id.desc()).limit(limit).offset(offset)

    return list(db.execute(stmt).scalars().all())


@router.get("/top", response_model=list[AuthorTopOut])
def list_top_authors(
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Author, func.count(AuthorLike.id).label("likes_count"))
        .outerjoin(AuthorLike, AuthorLike.author_id == Author.id)
        .group_by(Author.id)
        .having(func.count(AuthorLike.id) > 0)
        .order_by(func.count(AuthorLike.id).desc(), Author.name.asc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()
    out: list[AuthorTopOut] = []
    for author, likes_count in rows:
        out.append(
            AuthorTopOut(
                id=author.id,
                name=author.name,
                bio=author.bio,
                photo_url=author.photo_url,
                likes_count=int(likes_count or 0),
            )
        )
    return out


@router.get("/{author_id}", response_model=AuthorOut)
def get_author(author_id: int, db: Session = Depends(get_db)):
    author = db.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author


@router.get("/{author_id}/liked")
def liked_author(
    author_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Author, author_id):
        raise HTTPException(status_code=404, detail="Author not found")

    exists = db.execute(
        select(AuthorLike.id).where(AuthorLike.user_id == user.id, AuthorLike.author_id == author_id)
    ).scalar_one_or_none()
    return {"liked": bool(exists)}


@router.post("/{author_id}/liked")
def set_liked_author(
    author_id: int,
    payload: AuthorLikeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Author, author_id):
        raise HTTPException(status_code=404, detail="Author not found")

    liked = payload.liked
    row = db.execute(
        select(AuthorLike).where(AuthorLike.user_id == user.id, AuthorLike.author_id == author_id)
    ).scalar_one_or_none()

    if liked:
        if not row:
            db.add(AuthorLike(user_id=user.id, author_id=author_id))
            db.commit()
        return {"liked": True}

    if row:
        db.delete(row)
        db.commit()
    return {"liked": False}


@router.get("/{author_id}/books", response_model=list[BookOut])
def list_author_books(author_id: int, db: Session = Depends(get_db)):
    author = db.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    stmt = (
        _book_with_stats_stmt()
        .where(Book.authors.any(Author.id == author_id))
        .order_by(Book.id.desc())
    )

    rows = db.execute(stmt).all()
    out: list[BookOut] = []
    for book, rating_avg, rating_count in rows:
        book.rating_avg = float(rating_avg) if rating_avg is not None else None
        book.rating_count = int(rating_count or 0)
        out.append(book)
    return out
