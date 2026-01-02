from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_db
from app.models import Author, Book, User
from app.schemas.search import SearchAuthorOut, SearchBookOut, SearchResultsOut, SearchUserOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResultsOut)
def search(
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    query = q.strip()
    if not query:
        return SearchResultsOut()

    if query.startswith("@"):
        username = query[1:].strip()
        if not username:
            return SearchResultsOut()
        like = f"%{username}%"
        users = db.execute(
            select(User).where(User.username.ilike(like)).order_by(User.username.asc()).limit(limit)
        ).scalars().all()
        return SearchResultsOut(
            users=[SearchUserOut(id=u.id, username=u.username, avatar_url=u.avatar_url) for u in users]
        )

    like = f"%{query}%"
    book_rows = (
        db.execute(
            select(Book)
            .options(selectinload(Book.authors))
            .where(Book.title.ilike(like))
            .order_by(Book.title.asc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    author_rows = (
        db.execute(
            select(Author).where(Author.name.ilike(like)).order_by(Author.name.asc()).limit(limit)
        )
        .scalars()
        .all()
    )

    books: list[SearchBookOut] = []
    for b in book_rows:
        books.append(
            SearchBookOut(
                id=b.id,
                title=b.title,
                cover_url=b.cover_url,
                authors=[
                    SearchAuthorOut(id=a.id, name=a.name, photo_url=a.photo_url) for a in (b.authors or [])
                ],
            )
        )

    authors = [SearchAuthorOut(id=a.id, name=a.name, photo_url=a.photo_url) for a in author_rows]

    return SearchResultsOut(books=books, authors=authors)
