from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.media import save_media_file
from app.deps import get_db, require_admin
from app.models import Author, Book, Genre, Tag, User
from app.schemas import BookCreate, BookUpdate


router = APIRouter(prefix="/admin/books", tags=["admin"])


@router.get("")
def list_books(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Book)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(Book.title.ilike(like))

    stmt = stmt.order_by(Book.created_at.desc()).limit(limit).offset(offset)
    books = db.execute(stmt).scalars().all()

    return {
        "items": [
            {
                "id": b.id,
                "title": b.title,
                "description": b.description,
                "published_year": b.published_year,
                "cover_url": b.cover_url,
                "created_at": b.created_at.isoformat(),
                "authors": [{"id": a.id, "name": a.name} for a in (b.authors or [])],
                "tags": [{"id": t.id, "name": t.name} for t in (b.tags or [])],
                "genres": [{"id": g.id, "name": g.name} for g in (b.genres or [])],
            }
            for b in books
        ],
        "limit": limit,
        "offset": offset,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_book(
    payload: BookCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    book = Book(
        title=title,
        description=payload.description,
        published_year=payload.published_year,
    )

    if payload.author_ids:
        # Fetch authors and assign relationship
        authors = (
            db.execute(select(Author).where(Author.id.in_(payload.author_ids)))
            .scalars()
            .all()
        )

        found_ids = {a.id for a in authors}
        missing = [aid for aid in payload.author_ids if aid not in found_ids]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown author_ids: {missing}")

        book.authors = authors

    if payload.tag_ids:
        tags = db.execute(select(Tag).where(Tag.id.in_(payload.tag_ids))).scalars().all()
        found_ids = {t.id for t in tags}
        missing = [tid for tid in payload.tag_ids if tid not in found_ids]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown tag_ids: {missing}")
        book.tags = tags

    if payload.genre_ids:
        genres = db.execute(select(Genre).where(Genre.id.in_(payload.genre_ids))).scalars().all()
        found_ids = {g.id for g in genres}
        missing = [gid for gid in payload.genre_ids if gid not in found_ids]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown genre_ids: {missing}")
        book.genres = genres

    db.add(book)
    db.commit()
    db.refresh(book)

    return {
        "id": book.id,
        "title": book.title,
        "description": book.description,
        "published_year": book.published_year,
        "cover_url": book.cover_url,
        "created_at": book.created_at.isoformat(),
        "authors": [{"id": a.id, "name": a.name} for a in (book.authors or [])],
        "tags": [{"id": t.id, "name": t.name} for t in (book.tags or [])],
        "genres": [{"id": g.id, "name": g.name} for g in (book.genres or [])],
    }


@router.patch("/{book_id}")
def update_book(
    book_id: int,
    payload: BookUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")

    data = payload.model_dump(exclude_unset=True)

    if "title" in data and data["title"] is not None:
        title = data["title"].strip()
        if not title:
            raise HTTPException(status_code=422, detail="Title cannot be empty")
        b.title = title

    if "description" in data:
        b.description = data["description"]

    if "published_year" in data:
        b.published_year = data["published_year"]

    if "author_ids" in data:
        ids = data["author_ids"] or []
        if ids:
            authors = db.execute(select(Author).where(Author.id.in_(ids))).scalars().all()
            found = {a.id for a in authors}
            missing = [aid for aid in ids if aid not in found]
            if missing:
                raise HTTPException(status_code=422, detail=f"Unknown author_ids: {missing}")
            b.authors = authors
        else:
            # explicit empty array clears authors
            b.authors = []

    if "tag_ids" in data:
        ids = data["tag_ids"] or []
        if ids:
            tags = db.execute(select(Tag).where(Tag.id.in_(ids))).scalars().all()
            found = {t.id for t in tags}
            missing = [tid for tid in ids if tid not in found]
            if missing:
                raise HTTPException(status_code=422, detail=f"Unknown tag_ids: {missing}")
            b.tags = tags
        else:
            b.tags = []

    if "genre_ids" in data:
        ids = data["genre_ids"] or []
        if ids:
            genres = db.execute(select(Genre).where(Genre.id.in_(ids))).scalars().all()
            found = {g.id for g in genres}
            missing = [gid for gid in ids if gid not in found]
            if missing:
                raise HTTPException(status_code=422, detail=f"Unknown genre_ids: {missing}")
            b.genres = genres
        else:
            b.genres = []

    db.commit()
    db.refresh(b)

    return {
        "id": b.id,
        "title": b.title,
        "description": b.description,
        "published_year": b.published_year,
        "cover_url": b.cover_url,
        "created_at": b.created_at.isoformat(),
        "authors": [{"id": a.id, "name": a.name} for a in (b.authors or [])],
        "tags": [{"id": t.id, "name": t.name} for t in (b.tags or [])],
        "genres": [{"id": g.id, "name": g.name} for g in (b.genres or [])],
    }


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")

    db.delete(b)
    db.commit()
    return None


@router.post("/{book_id}/cover")
def upload_book_cover(
    book_id: int,
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")

    cover_url = save_media_file(file, f"books/{book_id}")
    b.cover_url = cover_url
    db.commit()
    db.refresh(b)

    return {"id": b.id, "cover_url": b.cover_url}
