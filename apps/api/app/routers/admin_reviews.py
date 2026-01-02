from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.deps import get_db, require_admin
from app.models import Book, Review, User

router = APIRouter(prefix="/admin/reviews", tags=["admin"])


@router.get("")
def list_reviews(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    # Search across: review body, book title, user email/username
    stmt = (
        select(Review)
        .join(Book, Review.book_id == Book.id)
        .join(User, Review.user_id == User.id)
    )

    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Review.body.ilike(like),
                Book.title.ilike(like),
                User.email.ilike(like),
                User.username.ilike(like),
            )
        )

    stmt = stmt.order_by(Review.created_at.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).scalars().all()

    return {
        "items": [
            {
                "id": r.id,
                "rating": r.rating,
                "body": r.body,
                "created_at": r.created_at.isoformat(),
                "book": {"id": r.book_id, "title": r.book.title},
                "user": {"id": r.user_id, "email": r.user.email, "username": r.user.username},
            }
            for r in rows
        ],
        "limit": limit,
        "offset": offset,
    }


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    r = db.get(Review, review_id)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(r)
    db.commit()
    return None
