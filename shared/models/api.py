from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, date

class EntityRef(BaseModel):
    entity_id: str
    display_name: Optional[str] = None

class ProjectSummaryView(BaseModel):
    project_id: str
    name: str
    program_name: Optional[str] = None
    status: str
    health: str
    manager: Optional[EntityRef] = None
    next_milestone: Optional[Dict] = None
    overdue_task_count: int = 0
    high_risk_count: int = 0
    data_as_of: datetime

class TaskView(BaseModel):
    task_id: str
    project_id: str
    title: str
    status: str
    priority: str
    assignee: Optional[EntityRef] = None
    due_date: Optional[date] = None
    is_overdue: bool = False
    version: int
    updated_at: datetime
    allowed_actions: List[str]

class WorkflowView(BaseModel):
    workflow_id: str
    status: str
    request_summary: str
    project: Optional[Dict] = None
    current_phase: Optional[str] = None
    requires_user_action: bool
    progress: Dict
    events: List
    citations: List
    artifacts: List
    approval: Optional[Dict] = None
    warnings: List[str]
    retryable: bool = False
    created_at: datetime
    updated_at: datetime

class ConnectorSafeView(BaseModel):
    connector_id: str
    connector_type: str
    display_name: str
    status: str
    mode: str
    allowed_source_count: int
    last_successful_sync_at: Optional[datetime] = None
    next_sync_at: Optional[datetime] = None
    requires_authorization: bool = False
    allowed_actions: List[str]

class CurrentUserView(BaseModel):
    user_id: str
    display_name: str
    locale: str
    timezone: str
    roles: List[str]
    capabilities: List[str]
    projects: List[Dict]

class PaginationResponse(BaseModel):
    items: List
    next_cursor: Optional[str] = None
    has_more: bool = False
    data_as_of: datetime

class ErrorView(BaseModel):
    error_code: str
    message: str
    correlation_id: Optional[str] = None
    retryable: bool = False
    details: Optional[Dict] = None
