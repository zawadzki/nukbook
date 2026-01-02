import argparse

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--role", default="admin")
    args = p.parse_args()

    db = SessionLocal()
    try:
        email = args.email.strip().lower()
        if db.query(User).filter(User.email == email).first():
            print("User already exists:", email)
            return

        u = User(
            email=email,
            password_hash=hash_password(args.password),
            role=args.role,
            status="active",
            token_version=0,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        print("Created user:", u.id, u.email, u.role)
    finally:
        db.close()


if __name__ == "__main__":
    main()
