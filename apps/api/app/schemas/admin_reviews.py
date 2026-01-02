from pydantic import BaseModel, Field


class AdminReviewsQuery(BaseModel):
    q: str | None = Field(default=None, max_length=200)
