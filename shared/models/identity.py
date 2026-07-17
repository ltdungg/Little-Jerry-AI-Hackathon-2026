from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from .common import TenantStatus, EntityStatus

class Tenant(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    tenant_id: str
    name: str = Field(..., max_length=200)
    slug: str
    status: TenantStatus
    default_timezone: str
    default_locale: str
    data_classification_policy: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
    schema_version: int = 1

class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str
    cognito_sub: str
    tenant_id: str
    email_normalized: str
    display_name: str
    status: EntityStatus
    locale: str
    timezone: str
    last_project_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
    schema_version: int = 1

class TenantMembership(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    tenant_id: str
    user_id: str
    roles: list[str]
    capabilities: list[str]
    status: EntityStatus
    joined_at: datetime
    version: int = 1
    policy_version: Optional[int] = None

class ProjectMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    tenant_id: str
    project_id: str
    user_id: str
    project_role: str
    capabilities: list[str]
    status: EntityStatus
    joined_at: datetime
    version: int = 1
