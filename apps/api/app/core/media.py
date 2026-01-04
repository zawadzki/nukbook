from __future__ import annotations

from pathlib import Path
from uuid import uuid4
import shutil

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps

from app.core.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


BOOK_COVER_SIZES = {
    "xs": (36, 48),
    "sm": (48, 64),
    "md": (108, 152),
    "lg": (250, 391),
}
AUTHOR_PHOTO_SIZES = {
    "xs": (32, 32),
    "sm": (96, 96),
    "md": (150, 150),
    "lg": (250, 250),
}
USER_AVATAR_SIZES = {
    "xs": (20, 20),
    "sm": (32, 32),
    "md": (80, 80),
    "lg": (150, 150),
}
USER_COVER_SIZES = {
    "lg": (1400, None),
}


def _save_media_file(file: UploadFile, subdir: str) -> tuple[str, Path]:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    ext = Path(file.filename or "").suffix.lower() or ".jpg"
    filename = f"{uuid4().hex}{ext}"
    root = Path(settings.MEDIA_DIR) / subdir
    root.mkdir(parents=True, exist_ok=True)
    path = root / filename
    with path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/media/{subdir}/{filename}", path


def _thumb_path(path: Path, label: str) -> Path:
    return path.with_name(f"{path.stem}_{label}{path.suffix}")


def _thumb_url(url: str, label: str) -> str:
    stem, ext = url.rsplit(".", 1)
    return f"{stem}_{label}.{ext}"


def _save_thumbnail(path: Path, label: str, width: int, height: int | None) -> None:
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        if height is None:
            if img.width > width:
                ratio = width / float(img.width)
                img = img.resize((width, max(1, int(img.height * ratio))), Image.LANCZOS)
        else:
            img = ImageOps.fit(img, (width, height), Image.LANCZOS)

        suffix = path.suffix.lower()
        if suffix in {".jpg", ".jpeg"} and img.mode != "RGB":
            img = img.convert("RGB")

        thumb_path = _thumb_path(path, label)
        save_kwargs: dict[str, int | bool] = {}
        if suffix in {".jpg", ".jpeg"}:
            save_kwargs = {"quality": 85, "optimize": True}
        elif suffix == ".png":
            save_kwargs = {"optimize": True}
        img.save(thumb_path, **save_kwargs)


def save_media_file(file: UploadFile, subdir: str) -> str:
    url, _ = _save_media_file(file, subdir)
    return url


def save_media_with_thumbs(file: UploadFile, subdir: str, sizes: dict[str, tuple[int, int | None]]) -> dict[str, str]:
    url, path = _save_media_file(file, subdir)
    thumbs: dict[str, str] = {}

    for label, size in sizes.items():
        _save_thumbnail(path, label, size[0], size[1])
        thumbs[label] = _thumb_url(url, label)

    thumbs["original"] = url
    return thumbs
