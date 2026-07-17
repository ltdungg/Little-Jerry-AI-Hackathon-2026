from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from .workflow import WorkflowMode
from .approval import ApprovalRequest
from .artifact import Artifact
from .citation import Citation

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    mode: WorkflowMode = WorkflowMode.auto
    idempotency_key: Optional[str] = None

class ChatResponse(BaseModel):
    workflow_id: UUID
    status: str
    answer: Optional[str] = None
    citations: List[Citation] = []
    artifacts: List[Artifact] = []
    approval: Optional[ApprovalRequest] = None

WorkflowResponse = ChatResponse

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: Optional[dict] = None
