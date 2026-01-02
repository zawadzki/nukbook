"""add social privacy

Revision ID: 5e9b7b2e1a64
Revises: 4c2a1f7b9d3e
Create Date: 2025-01-06 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5e9b7b2e1a64"
down_revision: Union[str, None] = "4c2a1f7b9d3e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_private", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("shelves", sa.Column("visibility", sa.String(length=16), server_default="private", nullable=False))

    op.create_table(
        "follows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("requester_id", sa.Integer(), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("requester_id", "target_id", name="uq_follows_pair"),
    )
    op.create_index(op.f("ix_follows_requester_id"), "follows", ["requester_id"], unique=False)
    op.create_index(op.f("ix_follows_target_id"), "follows", ["target_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_follows_target_id"), table_name="follows")
    op.drop_index(op.f("ix_follows_requester_id"), table_name="follows")
    op.drop_table("follows")
    op.drop_column("shelves", "visibility")
    op.drop_column("users", "is_private")
