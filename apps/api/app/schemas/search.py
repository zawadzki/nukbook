from pydantic import BaseModel


class SearchAuthorOut(BaseModel):
    id: int
    name: str
    photo_url: str | None = None

    class Config:
        from_attributes = True


class SearchBookOut(BaseModel):
    id: int
    title: str
    cover_url: str | None = None
    authors: list[SearchAuthorOut] = []

    class Config:
        from_attributes = True


class SearchUserOut(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class SearchResultsOut(BaseModel):
    books: list[SearchBookOut] = []
    authors: list[SearchAuthorOut] = []
    users: list[SearchUserOut] = []
