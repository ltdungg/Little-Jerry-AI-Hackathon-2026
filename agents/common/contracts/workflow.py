from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4
from .agent import TaskStatus, AgentTaskRequest, AgentTaskResult

class WorkflowMode(str, Enum):
    auto = "auto"
    sync = "sync"
    async_mode = "async"

class EventType(str, Enum):
    intent_classified = "intent_classified"
    agent_selected = "agent_selected"
    tool_requested = "tool_requested"
    approval_required = "approval_required"
    completed = "completed"
    failed = "failed"

class WorkflowState(BaseModel):
    workflow_id: UUID = Field(default_factory=uuid4)
    session_id: str
    tenant_id: str
    user_id: str
    status: TaskStatus
    mode: WorkflowMode
    tasks: List[AgentTaskRequest]
    result: Optional[AgentTaskResult] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    idempotency_key: Optional[str] = None

class WorkflowEvent(BaseModel):
    workflow_id: UUID
    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: EventType
    details: dict
