from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from uuid import UUID, uuid4

class UserRole(str, Enum):
    npo_staff = "npo_staff"
    project_manager = "project_manager"
    program_director = "program_director"
    knowledge_admin = "knowledge_admin"
    platform_admin = "platform_admin"
    auditor = "auditor"

class RequestContext(BaseModel):
    correlation_id: UUID = Field(default_factory=uuid4)
    workflow_id: Optional[UUID] = None
    session_id: str
    tenant_id: str
    user_id: str
    user_role: UserRole
    source_ip: Optional[str] = None
    idempotency_key: Optional[str] = None
