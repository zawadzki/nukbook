from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Shelf, User

SYSTEM_SHELVES = ["read", "reading", "want-to-read", "dropped"]


def ensure_system_shelves(db: Session, user: User) -> None:
    existing = db.execute(select(Shelf.name).where(Shelf.user_id == user.id)).scalars().all()
    existing_set = set(existing)

    created = False
    for name in SYSTEM_SHELVES:
        if name in existing_set:
            continue
        db.add(Shelf(user_id=user.id, name=name, is_system=True))
        created = True

    if created:
        db.commit()
