from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_current_user, get_db
from app.models import Book, ReadingStatus, User
from app.schemas import ReadingStatusIn, ReadingStatusOut

router = APIRouter(tags=["reading-status"])


def _apply_default_dates(status: str, started_at: date | None, finished_at: date | None):
    today = date.today()

    if status == "want_to_read":
        if started_at or finished_at:
            return started_at, finished_at
        return None, None

    if status == "reading":
        return started_at or today, finished_at if finished_at else None

    if status == "finished":
        return started_at or today, finished_at or today

    if status == "dropped":
        return started_at, finished_at if finished_at else None

    return started_at, finished_at


@router.get("/me/timeline", response_model=list[ReadingStatusOut])
def my_timeline(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(ReadingStatus)
        .where(ReadingStatus.user_id == user.id)
        .options(selectinload(ReadingStatus.book).selectinload(Book.authors))
        .order_by(ReadingStatus.updated_at.desc())
    )
    items = db.execute(stmt).scalars().all()
    return list(items)


@router.post("/books/{book_id}/status", response_model=ReadingStatusOut)
def upsert_status(
    book_id: int,
    payload: ReadingStatusIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Book, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    existing = db.execute(
        select(ReadingStatus).where(ReadingStatus.book_id == book_id, ReadingStatus.user_id == user.id)
    ).scalar_one_or_none()

    fields_set = payload.model_fields_set
    started_at = payload.started_at
    finished_at = payload.finished_at

    if existing:
        existing.status = payload.status
        if "started_at" in fields_set:
            existing.started_at = payload.started_at
        if "finished_at" in fields_set:
            existing.finished_at = payload.finished_at

        if "started_at" not in fields_set and "finished_at" not in fields_set:
            existing.started_at, existing.finished_at = _apply_default_dates(
                payload.status, existing.started_at, existing.finished_at
            )

        db.commit()
        db.refresh(existing)
        return existing

    if "started_at" not in fields_set and "finished_at" not in fields_set:
        started_at, finished_at = _apply_default_dates(payload.status, started_at, finished_at)
    rs = ReadingStatus(
        user_id=user.id,
        book_id=book_id,
        status=payload.status,
        started_at=started_at,
        finished_at=finished_at,
    )
    db.add(rs)
    db.commit()
    db.refresh(rs)
    return rs


@router.delete("/books/{book_id}/status", status_code=204)
def delete_status(
    book_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rs = db.execute(
        select(ReadingStatus).where(ReadingStatus.book_id == book_id, ReadingStatus.user_id == user.id)
    ).scalar_one_or_none()

    if not rs:
        return None

    db.delete(rs)
    db.commit()
    return None
