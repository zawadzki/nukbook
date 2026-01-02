from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.shelves import ensure_system_shelves
from app.deps import get_current_user, get_db
from app.models import Book, ReadingStatus, Shelf, User, shelf_books
from app.schemas.shelf import ShelfCreateIn, ShelfOut, ShelfUpdateIn

router = APIRouter(prefix="/shelves", tags=["shelves"])


def get_owned_shelf(db: Session, shelf_id: int, user: User) -> type[Shelf]:
    shelf = db.get(Shelf, shelf_id)
    if not shelf or shelf.user_id != user.id:
        raise HTTPException(status_code=404, detail="Shelf not found")
    return shelf


@router.get("/book/{book_id}")
def my_shelves_for_book(
    book_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    if not db.get(Book, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    rows = db.execute(
        select(shelf_books.c.shelf_id)
        .join(Shelf, Shelf.id == shelf_books.c.shelf_id)
        .where(Shelf.user_id == user.id)
        .where(shelf_books.c.book_id == book_id)
    ).all()
    shelf_ids = {r[0] for r in rows}

    shelves = db.execute(select(Shelf).where(Shelf.user_id == user.id)).scalars().all()

    return {
        "book_id": book_id,
        "shelves": [
            {
                "id": s.id,
                "name": s.name,
                "is_system": s.is_system,
                "visibility": s.visibility,
                "has_book": (s.id in shelf_ids),
            }
            for s in shelves
        ],
    }


@router.get("")
def list_my_shelves(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    rows = db.execute(
        select(
            Shelf.id,
            Shelf.name,
            Shelf.is_system,
            Shelf.visibility,
            func.count(shelf_books.c.book_id).label("book_count"),
        )
        .outerjoin(shelf_books, shelf_books.c.shelf_id == Shelf.id)
        .where(Shelf.user_id == user.id)
        .group_by(Shelf.id)
        .order_by(Shelf.is_system.desc(), Shelf.name.asc())
    ).all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "is_system": r.is_system,
            "visibility": r.visibility,
            "book_count": int(r.book_count or 0),
        }
        for r in rows
    ]


@router.post("", response_model=ShelfOut, status_code=status.HTTP_201_CREATED)
def create_shelf(
    payload: ShelfCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Shelf name required")
    if len(name) > 64:
        raise HTTPException(status_code=400, detail="Shelf name too long")

    shelf = Shelf(user_id=user.id, name=name, is_system=False, visibility=payload.visibility or "private")
    db.add(shelf)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Shelf name already exists")

    db.refresh(shelf)
    return shelf


@router.get("/{shelf_id}", response_model=ShelfOut)
def get_shelf(
    shelf_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)
    return get_owned_shelf(db, shelf_id, user)


@router.patch("/{shelf_id}", response_model=ShelfOut)
def update_shelf(
    shelf_id: int,
    payload: ShelfUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    shelf = get_owned_shelf(db, shelf_id, user)

    if shelf.is_system and payload.name:
        raise HTTPException(status_code=403, detail="System shelves cannot be renamed")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Shelf name required")
        if len(name) > 64:
            raise HTTPException(status_code=400, detail="Shelf name too long")
        shelf.name = name

    if payload.visibility:
        shelf.visibility = payload.visibility
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Shelf name already exists")

    db.refresh(shelf)
    return shelf


@router.get("/{shelf_id}/books")
def list_books_in_shelf(
    shelf_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    shelf = get_owned_shelf(db, shelf_id, user)

    rows = db.execute(
        select(Book, ReadingStatus.status, ReadingStatus.started_at, ReadingStatus.finished_at)
        .join(shelf_books, shelf_books.c.book_id == Book.id)
        .outerjoin(
            ReadingStatus,
            (ReadingStatus.book_id == Book.id) & (ReadingStatus.user_id == user.id),
        )
        .where(shelf_books.c.shelf_id == shelf_id)
        .order_by(Book.title.asc())
    ).all()

    return {
        "shelf": {
            "id": shelf.id,
            "name": shelf.name,
            "is_system": shelf.is_system,
            "visibility": shelf.visibility,
        },
        "books": [
            {
                "id": b.id,
                "title": b.title,
                "published_year": getattr(b, "published_year", None),
                "cover_url": getattr(b, "cover_url", None),
                "authors": [{"id": a.id, "name": a.name} for a in (b.authors or [])],
                "reading_status": (
                    {"status": status, "started_at": started_at, "finished_at": finished_at}
                    if status
                    else None
                ),
            }
            for (b, status, started_at, finished_at) in rows
        ],
    }


@router.post("/{shelf_id}/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_book_to_shelf(
    shelf_id: int,
    book_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    shelf = get_owned_shelf(db, shelf_id, user)

    if not db.get(Book, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    if shelf.is_system:
        other_system_shelf_ids = db.execute(
            select(Shelf.id)
            .where(Shelf.user_id == user.id)
            .where(Shelf.is_system == True)  # noqa: E712
            .where(Shelf.id != shelf_id)
        ).scalars().all()

        if other_system_shelf_ids:
            db.execute(
                delete(shelf_books)
                .where(shelf_books.c.book_id == book_id)
                .where(shelf_books.c.shelf_id.in_(other_system_shelf_ids))
            )

    exists = db.execute(
        select(shelf_books.c.shelf_id)
        .where(shelf_books.c.shelf_id == shelf_id)
        .where(shelf_books.c.book_id == book_id)
    ).first()

    if not exists:
        db.execute(shelf_books.insert().values(shelf_id=shelf_id, book_id=book_id))

    db.commit()
    return


@router.delete("/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shelf(
    shelf_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    shelf = get_owned_shelf(db, shelf_id, user)

    if shelf.is_system:
        raise HTTPException(status_code=403, detail="System shelves cannot be deleted")

    db.delete(shelf)
    db.commit()
    return


@router.delete("/{shelf_id}/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_book_from_shelf(
    shelf_id: int,
    book_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_system_shelves(db, user)

    _ = get_owned_shelf(db, shelf_id, user)

    db.execute(
        delete(shelf_books)
        .where(shelf_books.c.shelf_id == shelf_id)
        .where(shelf_books.c.book_id == book_id)
    )
    db.commit()
    return
