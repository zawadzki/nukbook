from __future__ import annotations

import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.taste_compare import compute_pearson_from_aggregates, compute_similarity_score
from app.db.base import Base
from app.deps import get_current_user, get_db
from app.main import app
from app.models import Book, Follow, Review, User


class TasteCompareMathTests(unittest.TestCase):
    def test_similarity_edge_cases(self) -> None:
        self.assertEqual(compute_similarity_score(0.0, 0), 0.0)
        self.assertEqual(compute_similarity_score(0.0, 1), 100.0)
        self.assertEqual(compute_similarity_score(4.0, 1), 0.0)

    def test_pearson_insufficient_data(self) -> None:
        result = compute_pearson_from_aggregates(1, 5.0, 5.0, 25.0, 25.0, 25.0)
        self.assertIsNone(result)


class TasteCompareApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        self.viewer = User(
            email="viewer@example.com",
            username="viewer",
            hashed_password="hashed",
            is_private=False,
        )
        self.target = User(
            email="target@example.com",
            username="target",
            hashed_password="hashed",
            is_private=True,
        )
        self.db.add_all([self.viewer, self.target])
        self.db.commit()
        self.db.refresh(self.viewer)
        self.db.refresh(self.target)

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        def override_get_current_user():
            return self.viewer

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides = {}
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_privacy_blocks_compare(self) -> None:
        res = self.client.get(f"/users/{self.target.id}/taste-compare")
        self.assertEqual(res.status_code, 403)

    def test_payload_with_shared_ratings(self) -> None:
        follow = Follow(requester_id=self.viewer.id, target_id=self.target.id, status="accepted")
        self.db.add(follow)

        books = [
            Book(title="Alpha", description=None, published_year=None),
            Book(title="Beta", description=None, published_year=None),
            Book(title="Gamma", description=None, published_year=None),
            Book(title="Delta", description=None, published_year=None),
            Book(title="Epsilon", description=None, published_year=None),
        ]
        self.db.add_all(books)
        self.db.commit()
        for book in books:
            self.db.refresh(book)

        reviews = [
            Review(user_id=self.viewer.id, book_id=books[0].id, rating=5, body=None),
            Review(user_id=self.viewer.id, book_id=books[1].id, rating=1, body=None),
            Review(user_id=self.viewer.id, book_id=books[2].id, rating=4, body=None),
            Review(user_id=self.viewer.id, book_id=books[3].id, rating=5, body=None),
            Review(user_id=self.target.id, book_id=books[0].id, rating=4, body=None),
            Review(user_id=self.target.id, book_id=books[1].id, rating=5, body=None),
            Review(user_id=self.target.id, book_id=books[2].id, rating=4, body=None),
            Review(user_id=self.target.id, book_id=books[4].id, rating=5, body=None),
        ]
        self.db.add_all(reviews)
        self.db.commit()

        res = self.client.get(f"/users/{self.target.id}/taste-compare")
        self.assertEqual(res.status_code, 200)
        payload = res.json()

        self.assertEqual(payload["common_count"], 3)
        self.assertAlmostEqual(payload["mean_abs_diff"], 1.6667, places=3)
        self.assertAlmostEqual(payload["similarity_score"], 58.3, places=1)

        self.assertEqual(payload["agreements"][0]["title"], "Gamma")
        self.assertEqual(payload["disagreements"][0]["title"], "Beta")

        self.assertEqual(len(payload["shared_ratings"]), 3)
        viewer_loved = {row["title"] for row in payload["viewer_loved_target_unread"]}
        target_loved = {row["title"] for row in payload["target_loved_viewer_unread"]}
        self.assertIn("Delta", viewer_loved)
        self.assertIn("Epsilon", target_loved)
        for row in payload["viewer_loved_target_unread"]:
            self.assertIn("cover_url", row)
            self.assertIn("authors", row)
        for row in payload["target_loved_viewer_unread"]:
            self.assertIn("cover_url", row)
            self.assertIn("authors", row)


if __name__ == "__main__":
    unittest.main()
