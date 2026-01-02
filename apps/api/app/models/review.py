from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_reviews_user_book"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_1_5"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), index=True)

    rating: Mapped[int] = mapped_column(Integer(), nullable=False)
    body: Mapped[str | None] = mapped_column(Text(), nullable=True)

    is_hidden: Mapped[bool] = mapped_column(Boolean(), default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", lazy="joined")
    book = relationship("Book", lazy="joined")
