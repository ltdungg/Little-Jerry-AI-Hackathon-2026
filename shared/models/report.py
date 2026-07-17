from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional
from .common import ReportStatus

class Report(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    report_id: str
    tenant_id: str
    project_id: str
    workflow_id: Optional[str] = None
    report_type: str
    title: str
    period_start: date
    period_end: date
    status: ReportStatus
    artifact_id: Optional[str] = None
    artifact_s3_uri: Optional[str] = None
    content_type: str
    content_hash: Optional[str] = None
    citation_ids: list[str]
    warnings: list[str]
    generated_by_agent: str
    prompt_version: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    version: int = 1
