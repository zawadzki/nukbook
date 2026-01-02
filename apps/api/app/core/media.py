from __future__ import annotations

from pathlib import Path
from uuid import uuid4
import shutil

from fastapi import HTTPException, UploadFile

from app.core.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


def save_media_file(file: UploadFile, subdir: str) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    ext = Path(file.filename or "").suffix.lower()
    filename = f"{uuid4().hex}{ext}"
    root = Path(settings.MEDIA_DIR) / subdir
    root.mkdir(parents=True, exist_ok=True)
    path = root / filename
    with path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/media/{subdir}/{filename}"
