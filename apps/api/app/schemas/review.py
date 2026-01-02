from datetime import datetime

from pydantic import BaseModel, Field


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    body: str | None = None


class ReviewUserOut(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class ReviewOut(BaseModel):
    id: int
    user_id: int
    user: ReviewUserOut
    book_id: int
    rating: int
    body: str | None
    is_hidden: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
