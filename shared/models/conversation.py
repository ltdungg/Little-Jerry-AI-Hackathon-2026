from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ConversationSession(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str
    tenant_id: str
    user_id: str
    project_id: Optional[str] = None
    title: Optional[str] = None
    status: str = "active"
    last_message_at: Optional[datetime] = None
    message_count: int = 0
    agentcore_session_id: Optional[str] = None
    created_at: datetime
    expires_at: Optional[int] = None
