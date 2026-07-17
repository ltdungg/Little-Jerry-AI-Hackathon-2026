from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import ApprovalStatus

class Approval(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approval_id: str
    workflow_id: str
    tenant_id: str
    project_id: Optional[str] = None
    requested_by: str
    required_confirmer_user_id: str
    action_type: str
    action_hash: str
    action_preview: dict
    entity_version: int
    status: ApprovalStatus
    confirmation_token_hash: Optional[str] = None
    created_at: datetime
    expires_at: int
    decided_at: Optional[datetime] = None
    decided_by: Optional[str] = None
