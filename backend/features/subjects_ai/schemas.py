from typing import Literal
from pydantic import BaseModel, Field, model_validator

MAX_DOC_CHARS = 40_000
MAX_TOTAL_DOC_CHARS = 80_000


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)

    @model_validator(mode="after")
    def check_length(self):
        limit = 4000 if self.role == "user" else 20000
        if len(self.content) > limit:
            raise ValueError(f"{self.role} message too long (max {limit} characters)")
        return self


class ContextDocument(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=MAX_DOC_CHARS)


class ChatRequest(BaseModel):
    subject_id: str = Field(min_length=1, max_length=50)
    messages: list[Message] = Field(min_length=1, max_length=40)
    documents: list[ContextDocument] = Field(default_factory=list, max_length=5)
    material_ids: list[str] = Field(default_factory=list, max_length=5)
    subject_name: str | None = Field(default=None, max_length=100)
    
    @model_validator(mode="after")
    def check_total_size(self):
        total = sum(len(d.text) for d in self.documents)
        if total > MAX_TOTAL_DOC_CHARS:
            raise ValueError(f"Documents are too large in total (max {MAX_TOTAL_DOC_CHARS} characters)")
        if len(set(self.material_ids)) != len(self.material_ids):
            raise ValueError("Duplicate study material IDs are not allowed")
        return self


class ChatResponse(BaseModel):
    reply: str
