from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_db, require_admin
from app.models import Tag, User
from app.schemas import TagCreate


router = APIRouter(prefix="/admin/tags", tags=["admin"])


@router.get("")
def list_tags(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Tag)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(Tag.name.ilike(like))

    stmt = stmt.order_by(Tag.name.asc()).limit(limit).offset(offset)
    tags = db.execute(stmt).scalars().all()

    return {
        "items": [{"id": t.id, "name": t.name} for t in tags],
        "limit": limit,
        "offset": offset,
    }


@router.get("/lookup")
def lookup_tags(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str = Query(min_length=1),
    limit: int = Query(default=20, ge=1, le=50),
):
    like = f"%{q}%"

    stmt = (
        select(Tag.id, Tag.name)
        .where(Tag.name.ilike(like))
        .order_by(Tag.name.asc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()
    return {"items": [{"id": rid, "name": name} for (rid, name) in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    existing = db.execute(select(Tag).where(Tag.name == name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Tag with this name already exists")

    t = Tag(name=name)
    db.add(t)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tag with this name already exists")

    db.refresh(t)
    return {"id": t.id, "name": t.name}


@router.patch("/{tag_id}")
def update_tag(
    tag_id: int,
    payload: TagCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.get(Tag, tag_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tag not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    existing = db.execute(select(Tag).where(Tag.name == name, Tag.id != tag_id)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Tag with this name already exists")

    t.name = name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tag with this name already exists")

    db.refresh(t)
    return {"id": t.id, "name": t.name}


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.get(Tag, tag_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(t)
    db.commit()
    return None
