from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.media import AUTHOR_PHOTO_SIZES, save_media_with_thumbs
from app.deps import get_db, require_admin
from app.models import Author, User
from app.schemas import AuthorCreate, AuthorUpdate


router = APIRouter(prefix="/admin/authors", tags=["admin"])


@router.get("")
def list_authors(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Author)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(Author.name.ilike(like))

    stmt = stmt.order_by(Author.created_at.desc()).limit(limit).offset(offset)
    authors = db.execute(stmt).scalars().all()

    return {
        "items": [
            {
                "id": a.id,
                "name": a.name,
                "bio": a.bio,
                "photo_url": a.photo_url,
                "created_at": a.created_at.isoformat(),
            }
            for a in authors
        ],
        "limit": limit,
        "offset": offset,
    }


@router.get("/lookup")
def lookup_authors(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str = Query(min_length=1),
    limit: int = Query(default=20, ge=1, le=50),
):
    like = f"%{q}%"

    stmt = (
        select(Author.id, Author.name)
        .where(Author.name.ilike(like))
        .order_by(Author.name.asc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()
    return {"items": [{"id": rid, "name": name} for (rid, name) in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_author(
    payload: AuthorCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    existing = db.execute(select(Author).where(Author.name == name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Author with this name already exists")

    a = Author(name=name, bio=payload.bio)
    db.add(a)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Author with this name already exists")

    db.refresh(a)
    return {
        "id": a.id,
        "name": a.name,
        "bio": a.bio,
        "photo_url": a.photo_url,
        "created_at": a.created_at.isoformat(),
    }


@router.patch("/{author_id}")
def update_author(
    author_id: int,
    payload: AuthorUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    a = db.get(Author, author_id)
    if not a:
        raise HTTPException(status_code=404, detail="Author not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        new_name = data["name"].strip()
        if not new_name:
            raise HTTPException(status_code=422, detail="Name cannot be empty")

        # prevent duplicates (nice error)
        existing = db.execute(
            select(Author).where(Author.name == new_name, Author.id != author_id)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Author with this name already exists")

        a.name = new_name

    if "bio" in data:
        a.bio = data["bio"]  # can be None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Author with this name already exists")

    db.refresh(a)
    return {
        "id": a.id,
        "name": a.name,
        "bio": a.bio,
        "photo_url": a.photo_url,
        "created_at": a.created_at.isoformat(),
    }


@router.delete("/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_author(
    author_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    a = db.get(Author, author_id)
    if not a:
        raise HTTPException(status_code=404, detail="Author not found")

    db.delete(a)
    db.commit()
    return None


@router.post("/{author_id}/photo")
def upload_author_photo(
    author_id: int,
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    a = db.get(Author, author_id)
    if not a:
        raise HTTPException(status_code=404, detail="Author not found")

    thumbs = save_media_with_thumbs(file, f"authors/{author_id}", AUTHOR_PHOTO_SIZES)
    a.photo_url = thumbs["original"]
    db.commit()
    db.refresh(a)

    return {"id": a.id, "photo_url": a.photo_url, "photo_thumbs": thumbs}
