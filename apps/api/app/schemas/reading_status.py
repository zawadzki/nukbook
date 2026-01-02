from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.author import AuthorOut

ReadingStatusValue = Literal["want_to_read", "reading", "finished", "dropped"]


class BookMini(BaseModel):
    id: int
    title: str
    cover_url: str | None = None
    authors: list[AuthorOut] = []

    class Config:
        from_attributes = True


class ReadingStatusIn(BaseModel):
    status: ReadingStatusValue
    started_at: date | None = None
    finished_at: date | None = None


class ReadingStatusOut(BaseModel):
    id: int
    status: ReadingStatusValue
    started_at: date | None
    finished_at: date | None
    updated_at: datetime
    book: BookMini

    class Config:
        from_attributes = True
