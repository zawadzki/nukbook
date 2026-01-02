from pydantic import BaseModel, Field


class AuthorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    bio: str | None = None


class AuthorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    bio: str | None = None