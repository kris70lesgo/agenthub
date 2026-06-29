from pydantic import BaseModel, Field


class ApiMessage(BaseModel):
    message: str


class PaginatedResponse[T](BaseModel):
    items: list[T]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
