from fastapi import APIRouter, Depends

from app.deps import require_admin
from app.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(user: User = Depends(require_admin)):
    return {
        "ok": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
        },
    }
