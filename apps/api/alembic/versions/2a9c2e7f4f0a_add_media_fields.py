"""add media fields

Revision ID: 2a9c2e7f4f0a
Revises: c5f87eb6ebdd
Create Date: 2025-01-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2a9c2e7f4f0a"
down_revision: Union[str, None] = "c5f87eb6ebdd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("authors", sa.Column("photo_url", sa.String(length=500), nullable=True))
    op.add_column("books", sa.Column("cover_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("books", "cover_url")
    op.drop_column("authors", "photo_url")
