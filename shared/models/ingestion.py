from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import IngestionStatus, Classification, SourceSystem

class SourceDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")
    document_id: str
    tenant_id: str
    project_id: str
    connector_id: str
    source_system: SourceSystem
    canonical_source_id: str
    source_uri: Optional[str] = None
    title: Optional[str] = None
    classification: Classification
    allowed_roles: list[str]
    allowed_user_ids: list[str]
    raw_s3_uri: Optional[str] = None
    curated_s3_uri: Optional[str] = None
    content_hash: Optional[str] = None
    source_last_modified_at: Optional[datetime] = None
    ingested_at: datetime
    ingestion_status: IngestionStatus
    schema_version: int = 1
