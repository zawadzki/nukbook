from sqlalchemy import Column, ForeignKey, Table, UniqueConstraint

from app.db.base import Base

shelf_books = Table(
    "shelf_books",
    Base.metadata,
    Column("shelf_id", ForeignKey("shelves.id", ondelete="CASCADE"), primary_key=True),
    Column("book_id", ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("shelf_id", "book_id", name="uq_shelf_books_pair"),
)
