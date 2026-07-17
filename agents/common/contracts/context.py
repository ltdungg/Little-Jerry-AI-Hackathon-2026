from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from uuid import UUID, uuid4

# Single-tenant deployment: the platform serves ONE organization (AIV).
# tenant_id is kept in the data model for record scoping/future-proofing but is
# a fixed constant instead of a per-request value from the client.
DEFAULT_TENANT_ID = "aiv"


class UserRole(str, Enum):
    # Roles within a single NPO (AIV): from most to least privileged.
    leader = "leader"                    # Lãnh đạo tổ chức
    project_manager = "project_manager"  # Quản lý dự án
    team_member = "team_member"          # Thành viên team
    volunteer = "volunteer"              # Tình nguyện viên (rotating base)


class RequestContext(BaseModel):
    correlation_id: UUID = Field(default_factory=uuid4)
    workflow_id: Optional[UUID] = None
    session_id: str
    tenant_id: str = DEFAULT_TENANT_ID
    user_id: str
    user_role: UserRole
    source_ip: Optional[str] = None
    idempotency_key: Optional[str] = None
