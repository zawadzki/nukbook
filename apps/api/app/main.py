from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.books import router as books_router
from app.routers.authors import router as authors_router
from app.routers.reviews import router as reviews_router
from app.routers.shelves import router as shelves_router
from app.routers.admin import router as admin_router
from app.routers.admin_users import router as admin_users_router
from app.routers.admin_authors import router as admin_authors_router
from app.routers.admin_books import router as admin_books_router
from app.routers.admin_tags import router as admin_tags_router
from app.routers.admin_genres import router as admin_genres_router
from app.routers.admin_reviews import router as admin_reviews_router
from app.routers.reading_status import router as reading_status_router
from app.routers.recommendations import router as recommendations_router
from app.routers.social import router as social_router
from app.routers.search import router as search_router


app = FastAPI(title="nukBook API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.WEB_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

media_root = Path(settings.MEDIA_DIR)
media_root.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_root), name="media")

app.include_router(auth_router)
app.include_router(books_router)
app.include_router(authors_router)
app.include_router(reviews_router)
app.include_router(shelves_router)
app.include_router(admin_router)
app.include_router(admin_users_router)
app.include_router(admin_authors_router)
app.include_router(admin_books_router)
app.include_router(admin_tags_router)
app.include_router(admin_genres_router)
app.include_router(admin_reviews_router)
app.include_router(reading_status_router)
app.include_router(recommendations_router)
app.include_router(social_router)
app.include_router(search_router)


@app.get("/health")
def health():
    return {"ok": True}
