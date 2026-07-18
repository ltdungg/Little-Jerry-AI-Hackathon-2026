from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4

class TaskIntent(str, Enum):
    knowledge_search = "knowledge_search"
    task_query = "task_query"
    task_write = "task_write"
    report_generation = "report_generation"
    communication = "communication"
    general_chat = "general_chat"
    workflow_orchestration = "workflow_orchestration"
    unknown = "unknown"

class SourceSystem(str, Enum):
    drive = "drive"
    sharepoint = "sharepoint"
    slack = "slack"
    s3 = "s3"
    manual = "manual"

class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    waiting_for_user = "waiting_for_user"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"
    partial = "partial"

class Fact(BaseModel):
    key: str
    value: str
    source_citation_id: Optional[str] = None

class AgentMetrics(BaseModel):
    latency_ms: int
    input_tokens: int
    output_tokens: int

class TaskConstraints(BaseModel):
    tenant_id: str
    project_ids: List[str]
    allowed_sources: List[SourceSystem]
    deadline_epoch_ms: int = 0
    user_id: str
    user_role: str
    session_id: str = ""

class AgentTaskRequest(BaseModel):
    workflow_id: str
    task_id: str
    parent_task_id: Optional[str] = None
    agent_name: str
    intent: TaskIntent
    instructions: str
    inputs: dict
    constraints: TaskConstraints

class ProposedAction(BaseModel):
    action_id: str
    action_type: str
    parameters: dict
    preview: dict
    confirmation_token: Optional[str] = None

class Artifact(BaseModel):
    artifact_id: str
    artifact_type: str
    title: str
    s3_uri: str
    created_at: datetime

class Citation(BaseModel):
    citation_id: UUID = Field(default_factory=uuid4)
    source_system: SourceSystem
    document_id: str
    document_title: str
    source_uri: str
    s3_uri: Optional[str] = None
    page_or_section: Optional[str] = None
    excerpt: str
    last_modified_at: datetime

class AgentTaskResult(BaseModel):
    workflow_id: str
    task_id: str
    agent_name: str
    status: TaskStatus
    summary: str
    facts: List[Fact]
    citations: List[Citation]
    proposed_actions: List[ProposedAction]
    artifacts: List[Artifact]
    warnings: List[str]
    confidence: float = Field(ge=0, le=1)
    retryable: bool
    metrics: AgentMetrics
