from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional
from .common import RiskStatus, compute_severity, severity_rank

class Risk(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    risk_id: str
    tenant_id: str
    project_id: str
    title: str = Field(..., max_length=300)
    description: str = Field(..., max_length=10000)
    status: RiskStatus
    category: str
    likelihood: int = Field(..., ge=1, le=5)
    impact: int = Field(..., ge=1, le=5)
    score: int
    severity: str
    owner_user_id: str
    mitigation: Optional[str] = None
    review_date: Optional[date] = None
    source_citation_ids: list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
