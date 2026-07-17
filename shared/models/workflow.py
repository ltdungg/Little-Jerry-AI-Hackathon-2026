from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import WorkflowStatus, AgentTaskStatus, WorkflowMode, WorkflowEventType, ActorType

class Workflow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    workflow_id: str
    tenant_id: str
    user_id: str
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    request_type: str
    request_summary: str
    request_hash: Optional[str] = None
    status: WorkflowStatus
    mode: WorkflowMode
    current_phase: Optional[str] = None
    plan_version: int = 1
    expected_task_count: int = 0
    completed_task_count: int = 0
    failed_task_count: int = 0
    requires_user_action: bool = False
    result_summary: Optional[str] = None
    report_id: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    updated_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[int] = None
    version: int = 1
    schema_version: int = 1

class AgentTask(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_id: str
    workflow_id: str
    parent_task_id: Optional[str] = None
    agent_name: str
    intent: str
    status: AgentTaskStatus
    dependency_task_ids: list[str] = []
    attempt: int = 1
    max_attempts: int = 2
    input_ref: Optional[str] = None
    output_ref: Optional[str] = None
    summary: Optional[str] = None
    citation_ids: list[str] = []
    retryable: bool = False
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    latency_ms: Optional[int] = None
    model_id: Optional[str] = None
    prompt_version: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    error: Optional[str] = None

class WorkflowEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    workflow_id: str
    event_type: WorkflowEventType
    public_message: str  # max 500
    actor_type: ActorType
    actor_id: str
    task_id: Optional[str] = None
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    safe_metadata: dict
    created_at: datetime
