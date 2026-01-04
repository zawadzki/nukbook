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
from app.models import Genre, User
from app.schemas import GenreCreate


router = APIRouter(prefix="/admin/genres", tags=["admin"])


@router.get("")
def list_genres(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    params: ListParams = Depends(list_params),
):
    return list_items(db, Genre, params.q, params.limit, params.offset)


@router.get("/lookup")
def lookup_genres(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    params: LookupParams = Depends(lookup_params),
):
    return lookup_items(db, Genre, params.q, params.limit)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_genre(
    payload: GenreCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return create_item(db, Genre, payload.name, "Genre with this name already exists")


@router.patch("/{genre_id}")
def update_genre(
    genre_id: int,
    payload: GenreCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return update_item(db, Genre, genre_id, payload.name, "Genre not found", "Genre with this name already exists")


@router.delete("/{genre_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_genre(
    genre_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    delete_item(db, Genre, genre_id, "Genre not found")
    return None
