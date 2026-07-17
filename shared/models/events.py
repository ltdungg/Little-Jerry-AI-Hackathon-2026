from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import ActorType

class EventActor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor_type: ActorType
    actor_id: str

class EventEntity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_type: str
    entity_id: str
    version: Optional[int] = None

class DomainEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    event_type: str  # ends with .v1/.v2
    occurred_at: datetime
    tenant_id: str
    project_id: Optional[str] = None
    actor: EventActor
    correlation_id: str
    causation_id: Optional[str] = None
    entity: EventEntity
    safe_changes: dict
    schema_version: int = 1
