from pydantic import BaseModel, Field
from typing import List, Optional
from agents.common.contracts.common import EntityStatus, AuditFields

class Tenant(BaseModel):
    tenant_id: str
    name: str
    slug: str
    status: EntityStatus
    default_timezone: str
    default_locale: str
    data_classification_policy: str

class UserProfile(BaseModel):
    user_id: str
    cognito_sub: str
    tenant_id: str
    email_normalized: str
    display_name: str
    status: EntityStatus
    locale: str
    timezone: str
    last_project_id: Optional[str] = None

class TenantMembership(BaseModel):
    tenant_id: str
    user_id: str
    roles: List[str]
    capabilities: List[str]
    status: EntityStatus

class ProjectMember(BaseModel):
    tenant_id: str
    project_id: str
    user_id: str
    project_role: str
    capabilities: List[str]
    status: EntityStatus
