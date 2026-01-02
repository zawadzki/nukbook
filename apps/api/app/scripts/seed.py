from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Author, Book


def main() -> None:
    db: Session = SessionLocal()

    try:
        # avoid duplicating seeds
        if db.query(Book).count() > 0:
            print("Seed skipped: books already exist")
            return

        a1 = Author(name="Frank Herbert", bio="Author of Dune.")
        a2 = Author(name="J.R.R. Tolkien", bio="Author of The Lord of the Rings.")
        a3 = Author(name="Ursula K. Le Guin", bio="Author of Earthsea.")

        b1 = Book(title="Dune", published_year=1965, description="Sci-fi classic.")
        b1.authors.append(a1)

        b2 = Book(title="The Hobbit", published_year=1937, description="There and back again.")
        b2.authors.append(a2)

        b3 = Book(title="A Wizard of Earthsea", published_year=1968, description="A coming-of-age fantasy.")
        b3.authors.append(a3)

        db.add_all([a1, a2, a3, b1, b2, b3])
        db.commit()
        print("Seed OK")
    finally:
        db.close()


if __name__ == "__main__":
    main()
