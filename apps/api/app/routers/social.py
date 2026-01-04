from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.core.taste_compare import compute_pearson_from_aggregates, compute_similarity_score
from app.deps import get_current_user, get_db
from app.models import Author, AuthorLike, Book, Follow, ReadingStatus, Review, Shelf, User, shelf_books
from app.schemas import (
    ActivityItem,
    AuthorOut,
    LikedAuthorOut,
    PrivacyUpdateIn,
    ProfileOut,
    TasteCompareOut,
)
from app.core.media import save_media_with_thumbs, USER_AVATAR_SIZES, USER_COVER_SIZES

router = APIRouter(tags=["social"])


def _follow_status(db: Session, me_id: int, target_id: int) -> str:
    row = db.execute(
        select(Follow.status).where(Follow.requester_id == me_id, Follow.target_id == target_id)
    ).scalar_one_or_none()
    return row or "none"


def _is_following(db: Session, me_id: int, target_id: int) -> bool:
    row = db.execute(
        select(Follow.id).where(
            Follow.requester_id == me_id, Follow.target_id == target_id, Follow.status == "accepted"
        )
    ).scalar_one_or_none()
    return row is not None


@router.get("/users/{user_id}", response_model=ProfileOut)
def get_profile(
    user_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    followers_count = db.execute(
        select(func.count(Follow.id)).where(Follow.target_id == user_id, Follow.status == "accepted")
    ).scalar_one()
    following_count = db.execute(
        select(func.count(Follow.id)).where(Follow.requester_id == user_id, Follow.status == "accepted")
    ).scalar_one()

    status_value = "none" if me.id == user_id else _follow_status(db, me.id, user_id)

    return ProfileOut(
        id=u.id,
        username=u.username,
        is_private=u.is_private,
        followers_count=int(followers_count or 0),
        following_count=int(following_count or 0),
        is_me=u.id == me.id,
        follow_status=status_value,
        avatar_url=u.avatar_url,
        cover_url=u.cover_url,
    )


@router.patch("/me/privacy")
def update_privacy(
    payload: PrivacyUpdateIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me.is_private = payload.is_private
    db.commit()
    db.refresh(me)
    return {"id": me.id, "is_private": me.is_private}


@router.post("/me/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thumbs = save_media_with_thumbs(file, f"users/{me.id}/avatar", USER_AVATAR_SIZES)
    me.avatar_url = thumbs["original"]
    db.commit()
    db.refresh(me)
    return {"id": me.id, "avatar_url": me.avatar_url, "avatar_thumbs": thumbs}


@router.post("/me/cover")
def upload_cover(
    file: UploadFile = File(...),
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thumbs = save_media_with_thumbs(file, f"users/{me.id}/cover", USER_COVER_SIZES)
    me.cover_url = thumbs["original"]
    db.commit()
    db.refresh(me)
    return {"id": me.id, "cover_url": me.cover_url, "cover_thumbs": thumbs}


@router.post("/users/{user_id}/follow")
def follow_user(
    user_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id == me.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.execute(
        select(Follow).where(Follow.requester_id == me.id, Follow.target_id == user_id)
    ).scalar_one_or_none()

    if existing:
        return {"status": existing.status}

    status_value = "pending" if target.is_private else "accepted"
    f = Follow(requester_id=me.id, target_id=user_id, status=status_value)
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"status": f.status}


@router.post("/users/{user_id}/unfollow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(Follow).where(Follow.requester_id == me.id, Follow.target_id == user_id)
    ).scalar_one_or_none()
    if not row:
        return None
    db.delete(row)
    db.commit()
    return None


@router.get("/me/follow-requests")
def list_follow_requests(
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Follow)
        .where(Follow.target_id == me.id, Follow.status == "pending")
        .options(selectinload(Follow.requester))
        .order_by(Follow.created_at.desc())
    ).scalars().all()

    return [
        {
            "id": f.id,
            "requester": {
                "id": f.requester.id,
                "username": f.requester.username,
                "avatar_url": f.requester.avatar_url,
            },
            "created_at": f.created_at.isoformat(),
        }
        for f in rows
    ]


@router.get("/me/notifications")
def notification_counts(
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req_stmt = select(func.count(Follow.id)).where(Follow.target_id == me.id, Follow.status == "pending")
    if me.last_requests_seen_at:
        req_stmt = req_stmt.where(Follow.created_at > me.last_requests_seen_at)
    pending = db.execute(req_stmt).scalar_one()

    follow_ids = db.execute(
        select(Follow.target_id).where(Follow.requester_id == me.id, Follow.status == "accepted")
    ).scalars().all()

    activity = 0
    if follow_ids:
        status_stmt = select(func.count(ReadingStatus.id)).where(ReadingStatus.user_id.in_(follow_ids))
        review_stmt = (
            select(func.count(Review.id))
            .where(Review.user_id.in_(follow_ids))
            .where(Review.is_hidden == False)  # noqa: E712
        )
        if me.last_activity_seen_at:
            status_stmt = status_stmt.where(ReadingStatus.updated_at > me.last_activity_seen_at)
            review_stmt = review_stmt.where(Review.updated_at > me.last_activity_seen_at)
        activity = (db.execute(status_stmt).scalar_one() or 0) + (db.execute(review_stmt).scalar_one() or 0)

    return {"requests": int(pending or 0), "activity": int(activity)}


@router.get("/me/notifications/preview")
def notification_preview(
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req_stmt = select(Follow).where(Follow.target_id == me.id, Follow.status == "pending")
    if me.last_requests_seen_at:
        req_stmt = req_stmt.where(Follow.created_at > me.last_requests_seen_at)
    req_rows = (
        db.execute(req_stmt.options(selectinload(Follow.requester)).order_by(Follow.created_at.desc()))
        .scalars()
        .all()
    )

    follow_ids = db.execute(
        select(Follow.target_id).where(Follow.requester_id == me.id, Follow.status == "accepted")
    ).scalars().all()

    activity_items: list[ActivityItem] = []
    if follow_ids:
        status_stmt = select(ReadingStatus).where(ReadingStatus.user_id.in_(follow_ids))
        review_stmt = (
            select(Review)
            .where(Review.user_id.in_(follow_ids))
            .where(Review.is_hidden == False)  # noqa: E712
        )
        if me.last_activity_seen_at:
            status_stmt = status_stmt.where(ReadingStatus.updated_at > me.last_activity_seen_at)
            review_stmt = review_stmt.where(Review.updated_at > me.last_activity_seen_at)

        status_rows = (
            db.execute(
                status_stmt.options(selectinload(ReadingStatus.book).selectinload(Book.authors))
            )
            .scalars()
            .all()
        )
        review_rows = (
            db.execute(
                review_stmt.options(selectinload(Review.book).selectinload(Book.authors), selectinload(Review.user))
            )
            .scalars()
            .all()
        )

        users = db.execute(select(User).where(User.id.in_(follow_ids))).scalars().all()
        user_map = {u.id: u.username for u in users}
        user_avatar_map = {u.id: u.avatar_url for u in users}
        review_map = {(r.user_id, r.book_id): r for r in review_rows}

        for rs in status_rows:
            review = review_map.get((rs.user_id, rs.book_id))
            activity_items.append(
                ActivityItem(
                    type="status",
                    user={
                        "id": rs.user_id,
                        "username": user_map.get(rs.user_id, "user"),
                        "avatar_url": user_avatar_map.get(rs.user_id),
                    },
                    book={
                        "id": rs.book.id,
                        "title": rs.book.title,
                        "cover_url": getattr(rs.book, "cover_url", None),
                        "authors": [{"id": a.id, "name": a.name} for a in (rs.book.authors or [])],
                    },
                    status=rs.status,
                    rating=review.rating if review and rs.status == "finished" else None,
                    updated_at=rs.updated_at,
                )
            )

        for r in review_rows:
            activity_items.append(
                ActivityItem(
                    type="review",
                    user={
                        "id": r.user_id,
                        "username": r.user.username,
                        "avatar_url": r.user.avatar_url,
                    },
                    book={
                        "id": r.book.id,
                        "title": r.book.title,
                        "cover_url": getattr(r.book, "cover_url", None),
                        "authors": [{"id": a.id, "name": a.name} for a in (r.book.authors or [])],
                    },
                    rating=r.rating,
                    body=r.body,
                    updated_at=r.updated_at,
                )
            )

        activity_items.sort(key=lambda x: x.updated_at, reverse=True)

    return {
        "requests": [
            {
                "id": f.id,
                "requester": {
                    "id": f.requester.id,
                    "username": f.requester.username,
                    "avatar_url": f.requester.avatar_url,
                },
                "created_at": f.created_at.isoformat(),
            }
            for f in req_rows
        ],
        "activity": activity_items[:5],
    }


@router.post("/me/notifications/seen")
def mark_notifications_seen(
    payload: dict,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    if payload.get("requests"):
        me.last_requests_seen_at = now
    if payload.get("activity"):
        me.last_activity_seen_at = now

    db.commit()
    db.refresh(me)
    return {"ok": True}


@router.post("/me/follow-requests/{request_id}/approve")
def approve_follow_request(
    request_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    f = db.get(Follow, request_id)
    if not f or f.target_id != me.id:
        raise HTTPException(status_code=404, detail="Request not found")

    f.status = "accepted"
    db.commit()
    db.refresh(f)
    return {"status": f.status}


@router.post("/me/follow-requests/{request_id}/deny", status_code=status.HTTP_204_NO_CONTENT)
def deny_follow_request(
    request_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    f = db.get(Follow, request_id)
    if not f or f.target_id != me.id:
        raise HTTPException(status_code=404, detail="Request not found")

    db.delete(f)
    db.commit()
    return None


@router.get("/me/following")
def list_following(
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Follow)
        .where(Follow.requester_id == me.id, Follow.status == "accepted")
        .options(selectinload(Follow.target))
        .order_by(Follow.created_at.desc())
    ).scalars().all()

    return [{"id": f.target.id, "username": f.target.username, "avatar_url": f.target.avatar_url} for f in rows]


@router.get("/users/{user_id}/following")
def list_user_following(
    user_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not _can_view_shelves(db, me, target):
        raise HTTPException(status_code=403, detail="Not allowed to view following")

    rows = db.execute(
        select(Follow)
        .where(Follow.requester_id == target.id, Follow.status == "accepted")
        .options(selectinload(Follow.target))
        .order_by(Follow.created_at.desc())
    ).scalars().all()

    return [{"id": f.target.id, "username": f.target.username, "avatar_url": f.target.avatar_url} for f in rows]


@router.get("/me/followers")
def list_followers(
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Follow)
        .where(Follow.target_id == me.id, Follow.status == "accepted")
        .options(selectinload(Follow.requester))
        .order_by(Follow.created_at.desc())
    ).scalars().all()

    return [{"id": f.requester.id, "username": f.requester.username, "avatar_url": f.requester.avatar_url} for f in rows]


@router.get("/users/{user_id}/followers")
def list_user_followers(
    user_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not _can_view_shelves(db, me, target):
        raise HTTPException(status_code=403, detail="Not allowed to view followers")

    rows = db.execute(
        select(Follow)
        .where(Follow.target_id == target.id, Follow.status == "accepted")
        .options(selectinload(Follow.requester))
        .order_by(Follow.created_at.desc())
    ).scalars().all()

    return [{"id": f.requester.id, "username": f.requester.username, "avatar_url": f.requester.avatar_url} for f in rows]


def _can_view_shelves(db: Session, me: User, target: User) -> bool:
    if me.id == target.id:
        return True
    if not target.is_private:
        return True
    return _is_following(db, me.id, target.id)


def _format_shared_row(row) -> dict:
    return {
        "book_id": row.book_id,
        "title": row.title,
        "viewer_rating": row.viewer_rating,
        "target_rating": row.target_rating,
        "diff": int(row.diff),
    }


@router.get("/users/{user_id}/shelves")
def list_user_shelves(
    user_id: int,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not _can_view_shelves(db, me, target):
        raise HTTPException(status_code=403, detail="Not allowed to view shelves")

    is_self = me.id == target.id
    is_following = _is_following(db, me.id, target.id)

    visibility_filter = None
    if not is_self:
        if is_following:
            visibility_filter = or_(Shelf.visibility == "public", Shelf.visibility == "followers")
        else:
            visibility_filter = Shelf.visibility == "public"

    stmt = (
        select(Shelf)
        .where(Shelf.user_id == target.id)
        .options(selectinload(Shelf.books))
        .order_by(Shelf.is_system.desc(), Shelf.name.asc())
    )
    if visibility_filter is not None:
        stmt = stmt.where(visibility_filter)

    shelves = db.execute(stmt).scalars().all()

    out = []
    for s in shelves:
        books = [
            {"id": b.id, "title": b.title, "cover_url": getattr(b, "cover_url", None)}
            for b in (s.books or [])
        ]
        out.append(
            {
                "id": s.id,
                "name": s.name,
                "visibility": s.visibility,
                "book_count": len(books),
                "books": books,
            }
        )

    return {
        "user": {"id": target.id, "username": target.username, "is_private": target.is_private},
        "shelves": out,
    }


@router.get("/users/{target_user_id}/taste-compare", response_model=TasteCompareOut)
def taste_compare(
    target_user_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="diff_desc"),
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not _can_view_shelves(db, me, target):
        raise HTTPException(status_code=403, detail="Not allowed to compare taste")

    viewer_review = aliased(Review)
    target_review = aliased(Review)

    shared_subq = (
        select(
            viewer_review.book_id.label("book_id"),
            Book.title.label("title"),
            viewer_review.rating.label("viewer_rating"),
            target_review.rating.label("target_rating"),
            func.abs(viewer_review.rating - target_review.rating).label("diff"),
        )
        .select_from(viewer_review)
        .join(
            target_review,
            and_(
                target_review.book_id == viewer_review.book_id,
                target_review.user_id == target.id,
                target_review.is_hidden == False,  # noqa: E712
            ),
        )
        .join(Book, Book.id == viewer_review.book_id)
        .where(
            viewer_review.user_id == me.id,
            viewer_review.is_hidden == False,  # noqa: E712
        )
        .subquery()
    )

    common_count = db.execute(select(func.count()).select_from(shared_subq)).scalar_one() or 0
    mean_abs_diff = db.execute(select(func.avg(shared_subq.c.diff))).scalar_one()
    mean_abs_diff_value = float(mean_abs_diff or 0.0)

    similarity_score = compute_similarity_score(mean_abs_diff_value, int(common_count or 0))

    pearson: float | None = None
    if common_count and common_count >= 5:
        sums = db.execute(
            select(
                func.sum(shared_subq.c.viewer_rating),
                func.sum(shared_subq.c.target_rating),
                func.sum(shared_subq.c.viewer_rating * shared_subq.c.viewer_rating),
                func.sum(shared_subq.c.target_rating * shared_subq.c.target_rating),
                func.sum(shared_subq.c.viewer_rating * shared_subq.c.target_rating),
            )
        ).one()
        pearson = compute_pearson_from_aggregates(
            int(common_count),
            float(sums[0] or 0.0),
            float(sums[1] or 0.0),
            float(sums[2] or 0.0),
            float(sums[3] or 0.0),
            float(sums[4] or 0.0),
        )

    agreements_rows = db.execute(
        select(shared_subq)
        .order_by(
            shared_subq.c.diff.asc(),
            ((shared_subq.c.viewer_rating + shared_subq.c.target_rating) / 2).desc(),
            shared_subq.c.title.asc(),
        )
        .limit(5)
    ).all()
    disagreements_rows = db.execute(
        select(shared_subq)
        .order_by(
            shared_subq.c.diff.desc(),
            case(
                (shared_subq.c.viewer_rating >= shared_subq.c.target_rating, shared_subq.c.viewer_rating),
                else_=shared_subq.c.target_rating,
            ).desc(),
            shared_subq.c.title.asc(),
        )
        .limit(5)
    ).all()

    shared_sort_map = {
        "diff_desc": [shared_subq.c.diff.desc(), shared_subq.c.title.asc()],
        "diff_asc": [shared_subq.c.diff.asc(), shared_subq.c.title.asc()],
        "title": [shared_subq.c.title.asc()],
        "viewer_rating": [shared_subq.c.viewer_rating.desc(), shared_subq.c.title.asc()],
        "target_rating": [shared_subq.c.target_rating.desc(), shared_subq.c.title.asc()],
    }
    if sort not in shared_sort_map:
        raise HTTPException(status_code=400, detail="Invalid sort option")

    shared_rows = db.execute(
        select(shared_subq).order_by(*shared_sort_map[sort]).limit(limit).offset(offset)
    ).all()

    viewer_loved_review = aliased(Review)
    viewer_loved_target_review = aliased(Review)
    viewer_loved_target_status = aliased(ReadingStatus)

    viewer_loved_rows = db.execute(
        select(Book, viewer_loved_review.rating)
        .join(
            viewer_loved_review,
            and_(
                viewer_loved_review.book_id == Book.id,
                viewer_loved_review.user_id == me.id,
                viewer_loved_review.is_hidden == False,  # noqa: E712
                viewer_loved_review.rating >= 4,
            ),
        )
        .outerjoin(
            viewer_loved_target_review,
            and_(
                viewer_loved_target_review.book_id == Book.id,
                viewer_loved_target_review.user_id == target.id,
            ),
        )
        .outerjoin(
            viewer_loved_target_status,
            and_(
                viewer_loved_target_status.book_id == Book.id,
                viewer_loved_target_status.user_id == target.id,
            ),
        )
        .where(
            viewer_loved_target_review.id.is_(None),
            viewer_loved_target_status.id.is_(None),
        )
        .options(selectinload(Book.authors))
        .order_by(viewer_loved_review.rating.desc(), Book.title.asc())
        .limit(10)
    ).all()

    target_loved_review = aliased(Review)
    target_loved_viewer_review = aliased(Review)
    target_loved_viewer_status = aliased(ReadingStatus)

    target_loved_rows = db.execute(
        select(Book, target_loved_review.rating)
        .join(
            target_loved_review,
            and_(
                target_loved_review.book_id == Book.id,
                target_loved_review.user_id == target.id,
                target_loved_review.is_hidden == False,  # noqa: E712
                target_loved_review.rating >= 4,
            ),
        )
        .outerjoin(
            target_loved_viewer_review,
            and_(
                target_loved_viewer_review.book_id == Book.id,
                target_loved_viewer_review.user_id == me.id,
            ),
        )
        .outerjoin(
            target_loved_viewer_status,
            and_(
                target_loved_viewer_status.book_id == Book.id,
                target_loved_viewer_status.user_id == me.id,
            ),
        )
        .where(
            target_loved_viewer_review.id.is_(None),
            target_loved_viewer_status.id.is_(None),
        )
        .options(selectinload(Book.authors))
        .order_by(target_loved_review.rating.desc(), Book.title.asc())
        .limit(10)
    ).all()

    return {
        "viewer": {"id": me.id, "username": me.username, "avatar_url": me.avatar_url},
        "target": {"id": target.id, "username": target.username, "avatar_url": target.avatar_url},
        "common_count": int(common_count or 0),
        "similarity_score": similarity_score,
        "mean_abs_diff": mean_abs_diff_value,
        "pearson": pearson,
        "agreements": [_format_shared_row(row) for row in agreements_rows],
        "disagreements": [_format_shared_row(row) for row in disagreements_rows],
        "viewer_loved_target_unread": [
            {
                "book_id": book.id,
                "title": book.title,
                "cover_url": book.cover_url,
                "authors": [{"id": a.id, "name": a.name} for a in (book.authors or [])],
                "viewer_rating": rating,
            }
            for book, rating in viewer_loved_rows
        ],
        "target_loved_viewer_unread": [
            {
                "book_id": book.id,
                "title": book.title,
                "cover_url": book.cover_url,
                "authors": [{"id": a.id, "name": a.name} for a in (book.authors or [])],
                "target_rating": rating,
            }
            for book, rating in target_loved_rows
        ],
        "shared_ratings": [_format_shared_row(row) for row in shared_rows],
    }


@router.get("/users/{user_id}/liked-authors", response_model=list[LikedAuthorOut])
def list_user_liked_authors(
    user_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not _can_view_shelves(db, me, target):
        raise HTTPException(status_code=403, detail="Not allowed to view liked authors")

    stmt = (
        select(Author, AuthorLike.created_at)
        .join(AuthorLike, AuthorLike.author_id == Author.id)
        .where(AuthorLike.user_id == target.id)
        .order_by(AuthorLike.created_at.desc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()
    out: list[LikedAuthorOut] = []
    for author, liked_at in rows:
        out.append(
            LikedAuthorOut(
                id=author.id,
                name=author.name,
                photo_url=author.photo_url,
                liked_at=liked_at,
            )
        )
    return out


@router.get("/users/{user_id}/activity", response_model=list[ActivityItem])
def user_activity_feed(
    user_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not _can_view_shelves(db, me, target):
        raise HTTPException(status_code=403, detail="Not allowed to view activity")

    status_rows = db.execute(
        select(ReadingStatus)
        .where(ReadingStatus.user_id == target.id)
        .options(selectinload(ReadingStatus.book).selectinload(Book.authors))
    ).scalars().all()

    review_rows = db.execute(
        select(Review)
        .where(Review.user_id == target.id)
        .where(Review.is_hidden == False)  # noqa: E712
        .options(selectinload(Review.book).selectinload(Book.authors), selectinload(Review.user))
    ).scalars().all()

    items: list[ActivityItem] = []

    review_map = {(r.user_id, r.book_id): r for r in review_rows}

    for rs in status_rows:
        review = review_map.get((rs.user_id, rs.book_id))
        items.append(
            ActivityItem(
                type="status",
                user={
                    "id": target.id,
                    "username": target.username,
                    "avatar_url": target.avatar_url,
                },
                book={
                    "id": rs.book.id,
                    "title": rs.book.title,
                    "cover_url": getattr(rs.book, "cover_url", None),
                    "authors": [{"id": a.id, "name": a.name} for a in (rs.book.authors or [])],
                },
                status=rs.status,
                rating=review.rating if review and rs.status == "finished" else None,
                updated_at=rs.updated_at,
            )
        )

    for r in review_rows:
        items.append(
            ActivityItem(
                type="review",
                user={
                    "id": target.id,
                    "username": target.username,
                    "avatar_url": target.avatar_url,
                },
                book={
                    "id": r.book.id,
                    "title": r.book.title,
                    "cover_url": getattr(r.book, "cover_url", None),
                    "authors": [{"id": a.id, "name": a.name} for a in (r.book.authors or [])],
                },
                rating=r.rating,
                body=r.body,
                updated_at=r.updated_at,
            )
        )

    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items[offset : offset + limit]


@router.get("/me/activity", response_model=list[ActivityItem])
def activity_feed(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follow_ids = db.execute(
        select(Follow.target_id).where(Follow.requester_id == me.id, Follow.status == "accepted")
    ).scalars().all()
    user_ids = list(set(follow_ids))

    if not user_ids:
        return []

    status_rows = db.execute(
        select(ReadingStatus)
        .where(ReadingStatus.user_id.in_(user_ids))
        .options(selectinload(ReadingStatus.book).selectinload(Book.authors))
    ).scalars().all()

    review_rows = db.execute(
        select(Review)
        .where(Review.user_id.in_(user_ids))
        .where(Review.is_hidden == False)  # noqa: E712
        .options(selectinload(Review.book).selectinload(Book.authors), selectinload(Review.user))
    ).scalars().all()

    items: list[ActivityItem] = []

    # Build user lookup
    users = db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()
    user_map = {u.id: u.username for u in users}
    user_avatar_map = {u.id: u.avatar_url for u in users}

    review_map = {(r.user_id, r.book_id): r for r in review_rows}

    for rs in status_rows:
        review = review_map.get((rs.user_id, rs.book_id))
        items.append(
            ActivityItem(
                type="status",
                user={
                    "id": rs.user_id,
                    "username": user_map.get(rs.user_id, "user"),
                    "avatar_url": user_avatar_map.get(rs.user_id),
                },
                book={
                    "id": rs.book.id,
                    "title": rs.book.title,
                    "cover_url": getattr(rs.book, "cover_url", None),
                    "authors": [{"id": a.id, "name": a.name} for a in (rs.book.authors or [])],
                },
                status=rs.status,
                rating=review.rating if review and rs.status == "finished" else None,
                updated_at=rs.updated_at,
            )
        )

    for r in review_rows:
        items.append(
            ActivityItem(
                type="review",
                user={
                    "id": r.user_id,
                    "username": r.user.username,
                    "avatar_url": r.user.avatar_url,
                },
                book={
                    "id": r.book.id,
                    "title": r.book.title,
                    "cover_url": getattr(r.book, "cover_url", None),
                    "authors": [{"id": a.id, "name": a.name} for a in (r.book.authors or [])],
                },
                rating=r.rating,
                body=r.body,
                updated_at=r.updated_at,
            )
        )

    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items[offset : offset + limit]
