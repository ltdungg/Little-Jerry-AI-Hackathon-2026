from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4
from .agent import SourceSystem

class Citation(BaseModel):
    citation_id: UUID = Field(default_factory=uuid4)
    source_system: SourceSystem
    document_id: str
    document_title: str
    source_uri: str
    s3_uri: Optional[str] = None
    page_or_section: Optional[str] = None
    excerpt: str
    last_modified_at: datetime
