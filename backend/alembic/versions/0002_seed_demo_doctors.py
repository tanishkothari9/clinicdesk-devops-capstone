"""seed demo doctors so a fresh environment is usable immediately

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-16
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

DEMO_DOCTORS = [
    {"full_name": "Dr. Asha Rao", "specialty": "Cardiology", "room": "C-101", "email": "asha.rao@clinicdesk.dev"},
    {"full_name": "Dr. Vikram Shah", "specialty": "Dermatology", "room": "D-204", "email": "vikram.shah@clinicdesk.dev"},
    {"full_name": "Dr. Meera Nair", "specialty": "Paediatrics", "room": "P-012", "email": "meera.nair@clinicdesk.dev"},
    {"full_name": "Dr. Arjun Menon", "specialty": "Orthopaedics", "room": "O-305", "email": "arjun.menon@clinicdesk.dev"},
]

doctors = sa.table(
    "doctors",
    sa.column("full_name", sa.String),
    sa.column("specialty", sa.String),
    sa.column("room", sa.String),
    sa.column("email", sa.String),
)


def upgrade() -> None:
    op.bulk_insert(doctors, DEMO_DOCTORS)


def downgrade() -> None:
    emails = [d["email"] for d in DEMO_DOCTORS]
    op.execute(doctors.delete().where(doctors.c.email.in_(emails)))
