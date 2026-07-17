from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import ConnectorStatus, ConnectorType

class ConnectorAllowedSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: str
    project_id: str
    display_name: str

class Connector(BaseModel):
    model_config = ConfigDict(extra="forbid")
    connector_id: str
    tenant_id: str
    connector_type: ConnectorType
    display_name: str
    status: ConnectorStatus
    mode: str
    secret_ref: str
    allowed_sources: list[ConnectorAllowedSource]
    schedule_expression: Optional[str] = None
    last_successful_sync_at: Optional[datetime] = None
    last_attempted_sync_at: Optional[datetime] = None
    next_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    version: int = 1

class SyncExecution(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sync_id: str
    tenant_id: str
    connector_id: str
    source_id: str
    status: str
    mode: str
    trigger: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    cursor_before: Optional[str] = None
    cursor_after: Optional[str] = None
    items_seen: int = 0
    items_created: int = 0
    items_updated: int = 0
    items_unchanged: int = 0
    items_deleted: int = 0
    items_quarantined: int = 0
    error_summary: list[str]
    correlation_id: Optional[str] = None
