from pydantic import BaseModel


class GenreOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
