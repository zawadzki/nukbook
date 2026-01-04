from __future__ import annotations

from collections.abc import Sequence
from typing import Any, NamedTuple

from sqlalchemy.engine import Row

from fastapi import Query

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def list_items(db: Session, model: Any, q: str | None, limit: int, offset: int) -> dict:
    stmt = select(model)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(model.name.ilike(like))
    stmt = stmt.order_by(model.name.asc()).limit(limit).offset(offset)
    rows = db.execute(stmt).scalars().all()
    return {
        "items": [{"id": item.id, "name": item.name} for item in rows],
        "limit": limit,
        "offset": offset,
    }


def lookup_items(db: Session, model: Any, q: str, limit: int) -> dict:
    like = f"%{q}%"
    stmt = select(model.id, model.name).where(model.name.ilike(like)).order_by(model.name.asc()).limit(limit)
    rows: Sequence[Row[Any]] = db.execute(stmt).all()
    return {"items": [{"id": rid, "name": name} for (rid, name) in rows]}


def create_item(db: Session, model: Any, name: str, duplicate_detail: str) -> dict:
    normalized = name.strip()
    existing = db.execute(select(model).where(model.name == normalized)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=duplicate_detail)

    item = model(name=normalized)
    db.add(item)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=duplicate_detail)

    db.refresh(item)
    return {"id": item.id, "name": item.name}


def update_item(db: Session, model: Any, item_id: int, name: str, not_found_detail: str, duplicate_detail: str) -> dict:
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=not_found_detail)

    normalized = name.strip()
    if not normalized:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    existing = (
        db.execute(select(model).where(model.name == normalized, model.id != item_id)).scalar_one_or_none()
    )
    if existing:
        raise HTTPException(status_code=409, detail=duplicate_detail)

    item.name = normalized
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=duplicate_detail)

    db.refresh(item)
    return {"id": item.id, "name": item.name}


def delete_item(db: Session, model: Any, item_id: int, not_found_detail: str) -> None:
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=not_found_detail)

    db.delete(item)
    db.commit()


class ListParams(NamedTuple):
    q: str | None
    limit: int
    offset: int


class LookupParams(NamedTuple):
    q: str
    limit: int


def list_params(
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ListParams:
    return ListParams(q=q, limit=limit, offset=offset)


def lookup_params(
    q: str = Query(min_length=1),
    limit: int = Query(default=20, ge=1, le=50),
) -> LookupParams:
    return LookupParams(q=q, limit=limit)
