from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Book, Review, User
from app.schemas.review import ReviewIn, ReviewOut

router = APIRouter(tags=["reviews"])


@router.get("/books/{book_id}/reviews", response_model=list[ReviewOut])
def list_reviews(book_id: int, db: Session = Depends(get_db)):
    # Ensure book exists
    if not db.get(Book, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    stmt = (
        select(Review)
        .where(Review.book_id == book_id)
        .where(Review.is_hidden == False)  # noqa: E712
        .order_by(Review.created_at.desc())
        .limit(100)
    )
    return list(db.execute(stmt).scalars().all())


@router.post("/books/{book_id}/reviews", response_model=ReviewOut)
def upsert_my_review(
    book_id: int,
    payload: ReviewIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Book, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    existing = db.execute(
        select(Review).where(Review.book_id == book_id).where(Review.user_id == user.id)
    ).scalar_one_or_none()

    if existing:
        existing.rating = payload.rating
        existing.body = payload.body
        existing.is_hidden = False  # if user edits, re-show
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    review = Review(
        user_id=user.id,
        book_id=book_id,
        rating=payload.rating,
        body=payload.body,
        is_hidden=False,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.delete("/books/{book_id}/reviews/me")
def delete_my_review(
    book_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.execute(
        select(Review).where(Review.book_id == book_id).where(Review.user_id == user.id)
    ).scalar_one_or_none()

    if not r:
        return
    db.delete(r)
    db.commit()
    return
