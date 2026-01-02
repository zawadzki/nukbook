"""add reading statuses

Revision ID: 4c2a1f7b9d3e
Revises: 3b1d4c8a9f2b
Create Date: 2025-01-06 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4c2a1f7b9d3e"
down_revision: Union[str, None] = "3b1d4c8a9f2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reading_statuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.Date(), nullable=True),
        sa.Column("finished_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "book_id", name="uq_reading_status_user_book"),
    )
    op.create_index(op.f("ix_reading_statuses_book_id"), "reading_statuses", ["book_id"], unique=False)
    op.create_index(op.f("ix_reading_statuses_user_id"), "reading_statuses", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reading_statuses_user_id"), table_name="reading_statuses")
    op.drop_index(op.f("ix_reading_statuses_book_id"), table_name="reading_statuses")
    op.drop_table("reading_statuses")
