from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from agents.common.contracts.common import TaskStatus, Priority

class Task(BaseModel):
    task_id: str
    tenant_id: str
    project_id: str
    milestone_id: Optional[str] = None
    related_risk_ids: List[str]
    title: str
    description: str
    status: TaskStatus
    priority: Priority
    assignee_user_id: str
    created_by: str
    due_date: datetime
    completed_at: Optional[datetime] = None
    blocked_reason: Optional[str] = None
    tags: List[str]
    updated_by: str
    version: int
