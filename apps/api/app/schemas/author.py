from pydantic import BaseModel


class AuthorOut(BaseModel):
    id: int
    name: str
    bio: str | None = None
    photo_url: str | None = None

    class Config:
        from_attributes = True


class AuthorTopOut(AuthorOut):
    likes_count: int


class AuthorLikeIn(BaseModel):
    liked: bool
