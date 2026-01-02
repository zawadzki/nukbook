from pydantic import BaseModel, Field


class UserAdminUpdate(BaseModel):
    role: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None