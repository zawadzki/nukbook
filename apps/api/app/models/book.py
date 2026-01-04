from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.author import Author
    from app.models.genre import Genre
    from app.models.tag import Tag


class Book(Base):
    __tablename__ = "books"
    __allow_unmapped__ = True

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    published_year: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rating_avg: float | None = None
    rating_count: int = 0

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    authors: Mapped[list["Author"]] = relationship(
        secondary="book_authors",
        back_populates="books",
        lazy="selectin",
    )

    tags: Mapped[list["Tag"]] = relationship(
        secondary="book_tags",
        back_populates="books",
        lazy="selectin",
    )

    genres: Mapped[list["Genre"]] = relationship(
        secondary="book_genres",
        back_populates="books",
        lazy="selectin",
    )
