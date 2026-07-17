from __future__ import annotations
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from decimal import Decimal

class TenantStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    archived = "archived"

class EntityStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    archived = "archived"

class Health(str, Enum):
    green = "green"
    amber = "amber"
    red = "red"
    unknown = "unknown"

class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class Classification(str, Enum):
    public = "public"
    internal = "internal"
    confidential = "confidential"
    restricted = "restricted"

class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    blocked = "blocked"
    done = "done"
    cancelled = "cancelled"

class RiskStatus(str, Enum):
    open = "open"
    mitigating = "mitigating"
    accepted = "accepted"
    closed = "closed"

class MilestoneStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    blocked = "blocked"
    completed = "completed"
    cancelled = "cancelled"

class ProjectStatus(str, Enum):
    planned = "planned"
    active = "active"
    on_hold = "on_hold"
    completed = "completed"
    archived = "archived"

class ReportStatus(str, Enum):
    generating = "generating"
    complete = "complete"
    partial = "partial"
    failed = "failed"
    archived = "archived"

class ConnectorStatus(str, Enum):
    not_configured = "not_configured"
    authorization_required = "authorization_required"
    healthy = "healthy"
    syncing = "syncing"
    degraded = "degraded"
    failed = "failed"
    disabled = "disabled"

class ConnectorType(str, Enum):
    sharepoint = "sharepoint"
    slack = "slack"
    google_drive = "google_drive"

class IngestionStatus(str, Enum):
    discovered = "discovered"
    raw_stored = "raw_stored"
    normalized = "normalized"
    queued_for_indexing = "queued_for_indexing"
    indexed = "indexed"
    quarantined = "quarantined"
    deleted_at_source = "deleted_at_source"
    retained = "retained"

class WorkflowStatus(str, Enum):
    received = "received"
    authorized = "authorized"
    planning = "planning"
    running = "running"
    waiting_for_user = "waiting_for_user"
    partial = "partial"
    completed = "completed"
    failed = "failed"
    rejected = "rejected"
    cancel_requested = "cancel_requested"
    cancelled = "cancelled"
    expired = "expired"

class AgentTaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    waiting_for_user = "waiting_for_user"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"
    partial = "partial"

class ApprovalStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"
    expired = "expired"
    invalidated = "invalidated"
    consumed = "consumed"

class WorkflowEventType(str, Enum):
    workflow_created = "workflow_created"
    authorization_completed = "authorization_completed"
    intent_classified = "intent_classified"
    plan_created = "plan_created"
    agent_task_started = "agent_task_started"
    agent_task_completed = "agent_task_completed"
    agent_task_failed = "agent_task_failed"
    clarification_requested = "clarification_requested"
    clarification_received = "clarification_received"
    approval_requested = "approval_requested"
    approval_confirmed = "approval_confirmed"
    approval_rejected = "approval_rejected"
    tool_invoked = "tool_invoked"
    artifact_created = "artifact_created"
    workflow_completed = "workflow_completed"
    workflow_failed = "workflow_failed"
    workflow_cancel_requested = "workflow_cancel_requested"
    workflow_cancelled = "workflow_cancelled"

class ActorType(str, Enum):
    user = "user"
    agent = "agent"
    system = "system"

class SourceSystem(str, Enum):
    sharepoint = "sharepoint"
    slack = "slack"
    google_drive = "google_drive"
    s3 = "s3"
    manual = "manual"

class WorkflowMode(str, Enum):
    supervisor = "supervisor"
    auto = "auto"

class UserRole(str, Enum):
    npo_staff = "npo_staff"
    project_manager = "project_manager"
    program_director = "program_director"
    knowledge_admin = "knowledge_admin"
    platform_admin = "platform_admin"
    auditor = "auditor"

def compute_severity(likelihood: int, impact: int) -> str:
    score = likelihood * impact
    if 1 <= score <= 4:
        return "low"
    elif 5 <= score <= 9:
        return "medium"
    elif 10 <= score <= 16:
        return "high"
    elif 17 <= score <= 25:
        return "critical"
    return "unknown"

def severity_rank(severity: str) -> str:
    mapping = {
        "critical": "01-critical",
        "high": "02-high",
        "medium": "03-medium",
        "low": "04-low"
    }
    return mapping.get(severity, "99-unknown")

class AuditFields(BaseModel):
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str | None = None
    version: int = 1
    schema_version: int = 1

    model_config = ConfigDict(from_attributes=True)

class EntityRef(BaseModel):
    entity_id: str
    display_name: str | None = None

    model_config = ConfigDict(from_attributes=True)
