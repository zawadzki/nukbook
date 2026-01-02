from pydantic import BaseModel, Field


class ShelfCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    visibility: str | None = Field(default=None, pattern="^(public|followers|private)$")


class ShelfUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    visibility: str | None = Field(default=None, pattern="^(public|followers|private)$")


class ShelfOut(BaseModel):
    id: int
    name: str
    is_system: bool
    visibility: str

    class Config:
        from_attributes = True


class ShelfWithCountOut(ShelfOut):
    book_count: int = 0


class ShelfBooksOut(BaseModel):
    shelf: ShelfOut
    books: list[dict]
