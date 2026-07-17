from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional
from .common import TaskStatus, Priority

class Task(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    task_id: str
    tenant_id: str
    project_id: str
    milestone_id: Optional[str] = None
    related_risk_ids: list[str]
    title: str = Field(..., max_length=300)
    description: str = Field(..., max_length=10000)
    status: TaskStatus
    priority: Priority
    assignee_user_id: Optional[str] = None
    created_by: str
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    blocked_reason: Optional[str] = None
    tags: list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    version: int = 1
    schema_version: int = 1
