from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.admin_taxonomy import (
    LookupParams,
    ListParams,
    create_item,
    delete_item,
    list_items,
    list_params,
    lookup_items,
    lookup_params,
    update_item,
)
from app.deps import get_db, require_admin
from app.models import Tag, User
from app.schemas import TagCreate


router = APIRouter(prefix="/admin/tags", tags=["admin"])


@router.get("")
def list_tags(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    params: ListParams = Depends(list_params),
):
    return list_items(db, Tag, params.q, params.limit, params.offset)


@router.get("/lookup")
def lookup_tags(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    params: LookupParams = Depends(lookup_params),
):
    return lookup_items(db, Tag, params.q, params.limit)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return create_item(db, Tag, payload.name, "Tag with this name already exists")


@router.patch("/{tag_id}")
def update_tag(
    tag_id: int,
    payload: TagCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return update_item(db, Tag, tag_id, payload.name, "Tag not found", "Tag with this name already exists")


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    delete_item(db, Tag, tag_id, "Tag not found")
    return None
