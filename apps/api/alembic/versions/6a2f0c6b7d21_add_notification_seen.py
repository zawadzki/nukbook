"""add notification seen timestamps

Revision ID: 6a2f0c6b7d21
Revises: 5e9b7b2e1a64
Create Date: 2025-01-06 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6a2f0c6b7d21"
down_revision: Union[str, None] = "5e9b7b2e1a64"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_activity_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_requests_seen_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_requests_seen_at")
    op.drop_column("users", "last_activity_seen_at")
