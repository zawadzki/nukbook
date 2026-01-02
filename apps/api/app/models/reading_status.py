from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReadingStatus(Base):
    __tablename__ = "reading_statuses"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_reading_status_user_book"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), index=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[date | None] = mapped_column(Date(), nullable=True)
    finished_at: Mapped[date | None] = mapped_column(Date(), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    book = relationship("Book", lazy="joined")
