"""add user avatar and cover

Revision ID: 8c0b1f4d9a21
Revises: 7b1c2f3d4a5e
Create Date: 2025-01-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c0b1f4d9a21"
down_revision: Union[str, None] = "7b1c2f3d4a5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("cover_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "cover_url")
    op.drop_column("users", "avatar_url")
