from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_db, require_admin
from app.models import Genre, User
from app.schemas import GenreCreate


router = APIRouter(prefix="/admin/genres", tags=["admin"])


@router.get("")
def list_genres(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Genre)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(Genre.name.ilike(like))

    stmt = stmt.order_by(Genre.name.asc()).limit(limit).offset(offset)
    genres = db.execute(stmt).scalars().all()

    return {
        "items": [{"id": g.id, "name": g.name} for g in genres],
        "limit": limit,
        "offset": offset,
    }


@router.get("/lookup")
def lookup_genres(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str = Query(min_length=1),
    limit: int = Query(default=20, ge=1, le=50),
):
    like = f"%{q}%"

    stmt = (
        select(Genre.id, Genre.name)
        .where(Genre.name.ilike(like))
        .order_by(Genre.name.asc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()
    return {"items": [{"id": rid, "name": name} for (rid, name) in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_genre(
    payload: GenreCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    existing = db.execute(select(Genre).where(Genre.name == name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Genre with this name already exists")

    g = Genre(name=name)
    db.add(g)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Genre with this name already exists")

    db.refresh(g)
    return {"id": g.id, "name": g.name}


@router.patch("/{genre_id}")
def update_genre(
    genre_id: int,
    payload: GenreCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    g = db.get(Genre, genre_id)
    if not g:
        raise HTTPException(status_code=404, detail="Genre not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    existing = db.execute(select(Genre).where(Genre.name == name, Genre.id != genre_id)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Genre with this name already exists")

    g.name = name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Genre with this name already exists")

    db.refresh(g)
    return {"id": g.id, "name": g.name}


@router.delete("/{genre_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_genre(
    genre_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    g = db.get(Genre, genre_id)
    if not g:
        raise HTTPException(status_code=404, detail="Genre not found")

    db.delete(g)
    db.commit()
    return None
