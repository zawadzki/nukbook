from pydantic import BaseModel, Field


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    published_year: int | None = Field(default=None, ge=0, le=3000)
    author_ids: list[int] = Field(default_factory=list)
    tag_ids: list[int] = Field(default_factory=list)
    genre_ids: list[int] = Field(default_factory=list)


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    published_year: int | None = Field(default=None, ge=0, le=3000)
    author_ids: list[int] | None = None
    tag_ids: list[int] | None = None
    genre_ids: list[int] | None = None
