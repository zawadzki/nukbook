from pydantic import BaseModel

from app.schemas.author import AuthorOut
from app.schemas.genre import GenreOut
from app.schemas.tag import TagOut


class BookOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    published_year: int | None = None
    cover_url: str | None = None
    authors: list[AuthorOut] = []
    tags: list[TagOut] = []
    genres: list[GenreOut] = []

    rating_avg: float | None = None
    rating_count: int = 0

    class Config:
        from_attributes = True
