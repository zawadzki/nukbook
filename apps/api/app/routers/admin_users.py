from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db, require_admin
from app.models import User
from app.schemas import UserAdminUpdate


router = APIRouter(prefix="/admin/users", tags=["admin"])


ALLOWED_ROLES = {"user", "admin", "staff"}


@router.get("")
def list_users(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(User)

    if q:
        like = f"%{q}%"
        stmt = stmt.where((User.email.ilike(like)) | (User.username.ilike(like)))

    stmt = stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
    users = db.execute(stmt).scalars().all()

    return {
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
        "limit": limit,
        "offset": offset,
    }


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    if "role" in data:
        role = (data["role"] or "").strip()
        if role not in ALLOWED_ROLES:
            raise HTTPException(status_code=422, detail=f"Invalid role. Allowed: {sorted(ALLOWED_ROLES)}")
        u.role = role

    if "is_active" in data:
        u.is_active = bool(data["is_active"])

    db.commit()
    db.refresh(u)

    return {
        "id": u.id,
        "email": u.email,
        "username": u.username,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat(),
    }
