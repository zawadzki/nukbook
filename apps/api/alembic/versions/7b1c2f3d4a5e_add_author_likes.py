"""add author likes

Revision ID: 7b1c2f3d4a5e
Revises: 6a2f0c6b7d21
Create Date: 2025-01-06 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7b1c2f3d4a5e"
down_revision: Union[str, None] = "6a2f0c6b7d21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "author_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["authors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "author_id", name="uq_author_likes_user_author"),
    )
    op.create_index(op.f("ix_author_likes_user_id"), "author_likes", ["user_id"], unique=False)
    op.create_index(op.f("ix_author_likes_author_id"), "author_likes", ["author_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_author_likes_author_id"), table_name="author_likes")
    op.drop_index(op.f("ix_author_likes_user_id"), table_name="author_likes")
    op.drop_table("author_likes")
