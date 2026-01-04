from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.author import AuthorOut


class ProfileOut(BaseModel):
    id: int
    username: str
    is_private: bool
    followers_count: int
    following_count: int
    is_me: bool
    follow_status: Literal["none", "pending", "accepted"]
    avatar_url: str | None = None
    cover_url: str | None = None


class PrivacyUpdateIn(BaseModel):
    is_private: bool


class ActivityBook(BaseModel):
    id: int
    title: str
    cover_url: str | None = None
    authors: list[AuthorOut] = []

    class Config:
        from_attributes = True


class ActivityUser(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class ActivityItem(BaseModel):
    type: Literal["status", "review"]
    user: ActivityUser
    book: ActivityBook
    status: Literal["want_to_read", "reading", "finished", "dropped"] | None = None
    rating: int | None = None
    body: str | None = None
    updated_at: datetime


class LikedAuthorOut(BaseModel):
    id: int
    name: str
    photo_url: str | None = None
    liked_at: datetime

    class Config:
        from_attributes = True


class TasteCompareUser(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None


class TasteCompareRating(BaseModel):
    book_id: int
    title: str
    viewer_rating: int
    target_rating: int
    diff: int


class TasteCompareViewerLoved(BaseModel):
    book_id: int
    title: str
    cover_url: str | None = None
    authors: list[AuthorOut] = []
    viewer_rating: int


class TasteCompareTargetLoved(BaseModel):
    book_id: int
    title: str
    cover_url: str | None = None
    authors: list[AuthorOut] = []
    target_rating: int


class TasteCompareOut(BaseModel):
    viewer: TasteCompareUser
    target: TasteCompareUser
    common_count: int
    similarity_score: float
    mean_abs_diff: float
    pearson: float | None = None
    agreements: list[TasteCompareRating]
    disagreements: list[TasteCompareRating]
    viewer_loved_target_unread: list[TasteCompareViewerLoved]
    target_loved_viewer_unread: list[TasteCompareTargetLoved]
    shared_ratings: list[TasteCompareRating]
