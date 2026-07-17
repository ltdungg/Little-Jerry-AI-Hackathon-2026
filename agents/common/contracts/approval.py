from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4
from .agent import ProposedAction

class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"

class ApprovalRequest(BaseModel):
    approval_id: UUID = Field(default_factory=uuid4)
    workflow_id: UUID
    action: ProposedAction
    requested_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    status: ApprovalStatus
