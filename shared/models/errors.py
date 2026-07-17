from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, ConfigDict
from typing import Any

class ErrorCode(str, Enum):
    validation_error = "validation_error"
    unauthenticated = "unauthenticated"
    unauthorized = "unauthorized"
    not_found = "not_found"
    entity_version_conflict = "entity_version_conflict"
    idempotency_conflict = "idempotency_conflict"
    workflow_state_conflict = "workflow_state_conflict"
    approval_expired = "approval_expired"
    approval_invalidated = "approval_invalidated"
    rate_limited = "rate_limited"
    dependency_unavailable = "dependency_unavailable"
    insufficient_evidence = "insufficient_evidence"
    internal_error = "internal_error"

class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    correlation_id: str | None = None
    retryable: bool = False
    details: dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)
