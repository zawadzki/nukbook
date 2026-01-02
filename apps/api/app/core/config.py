from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ISSUER: str = "nukbook"
    JWT_AUDIENCE: str = "nukbook-web"

    WEB_ORIGIN: str = "https://nukbook.local.dev"
    COOKIE_DOMAIN: str = ".nukbook.local.dev"

    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 14
    MEDIA_DIR: str = "media"

    class Config:
        env_file = ".env"


settings = Settings()
