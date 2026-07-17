from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from .common import SourceSystem, Classification

class Citation(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    citation_id: str
    tenant_id: str
    project_id: str
    source_system: SourceSystem
    connector_id: Optional[str] = None
    document_id: Optional[str] = None
    canonical_source_id: str
    document_title: Optional[str] = None
    source_uri: Optional[str] = None
    curated_s3_uri: Optional[str] = None
    page_or_section: Optional[str] = None
    excerpt: str = Field(..., max_length=1500)
    last_modified_at: Optional[datetime] = None
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    content_hash: Optional[str] = None
    classification: Classification
