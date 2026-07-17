from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class EntityStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"

class Health(str, Enum):
    GREEN = "green"
    AMBER = "amber"
    RED = "red"
    UNKNOWN = "unknown"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Classification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"

class RiskStatus(str, Enum):
    OPEN = "open"
    MITIGATING = "mitigating"
    ACCEPTED = "accepted"
    CLOSED = "closed"

class MilestoneStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ProjectStatus(str, Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class ReportStatus(str, Enum):
    GENERATING = "generating"
    COMPLETE = "complete"
    PARTIAL = "partial"
    FAILED = "failed"
    ARCHIVED = "archived"

class ConnectorStatus(str, Enum):
    NOT_CONFIGURED = "not_configured"
    AUTHORIZATION_REQUIRED = "authorization_required"
    HEALTHY = "healthy"
    SYNCING = "syncing"
    DEGRADED = "degraded"
    FAILED = "failed"
    DISABLED = "disabled"

class ConnectorType(str, Enum):
    SHAREPOINT = "sharepoint"
    SLACK = "slack"
    GOOGLE_DRIVE = "google_drive"

class IngestionStatus(str, Enum):
    DISCOVERED = "discovered"
    RAW_STORED = "raw_stored"
    NORMALIZED = "normalized"
    QUEUED_FOR_INDEXING = "queued_for_indexing"
    INDEXED = "indexed"
    QUARANTINED = "quarantined"
    DELETED_AT_SOURCE = "deleted_at_source"
    RETAINED = "retained"

class WorkflowStatus(str, Enum):
    RECEIVED = "received"
    AUTHORIZED = "authorized"
    PLANNING = "planning"
    RUNNING = "running"
    WAITING_FOR_USER = "waiting_for_user"
    PARTIAL = "partial"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"
    CANCEL_REQUESTED = "cancel_requested"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class AgentTaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_FOR_USER = "waiting_for_user"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    EXPIRED = "expired"
    INVALIDATED = "invalidated"
    CONSUMED = "consumed"

class WorkflowEventType(str, Enum):
    WORKFLOW_CREATED = "workflow_created"
    AUTHORIZATION_COMPLETED = "authorization_completed"
    INTENT_CLASSIFIED = "intent_classified"
    PLAN_CREATED = "plan_created"
    AGENT_TASK_STARTED = "agent_task_started"
    AGENT_TASK_COMPLETED = "agent_task_completed"
    AGENT_TASK_FAILED = "agent_task_failed"
    CLARIFICATION_REQUESTED = "clarification_requested"
    CLARIFICATION_RECEIVED = "clarification_received"
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_CONFIRMED = "approval_confirmed"
    APPROVAL_REJECTED = "approval_rejected"
    TOOL_INVOKED = "tool_invoked"
    ARTIFACT_CREATED = "artifact_created"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"
    WORKFLOW_CANCEL_REQUESTED = "workflow_cancel_requested"
    WORKFLOW_CANCELLED = "workflow_cancelled"

class ActorType(str, Enum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"

class SourceSystem(str, Enum):
    SHAREPOINT = "sharepoint"
    SLACK = "slack"
    GOOGLE_DRIVE = "google_drive"
    S3 = "s3"
    MANUAL = "manual"

def compute_severity(likelihood: int, impact: int) -> str:
    score = likelihood * impact
    if score <= 4: return "low"
    if score <= 9: return "medium"
    if score <= 16: return "high"
    return "critical"

def severity_rank(severity: str) -> str:
    return {"critical": "01-critical", "high": "02-high", "medium": "03-medium", "low": "04-low"}.get(severity, "05-unknown")

class AuditFields(BaseModel):
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: Optional[str] = None
    version: int = 1
    schema_version: int = 1
