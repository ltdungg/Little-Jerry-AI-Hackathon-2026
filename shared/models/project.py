from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from .common import ProjectStatus, Health, MilestoneStatus

class Program(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    program_id: str
    tenant_id: str
    name: str = Field(..., max_length=200)
    description: str
    status: ProjectStatus
    owner_user_id: str
    start_date: date
    end_date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: str
    tenant_id: str
    program_id: str
    code: str
    name: str = Field(..., max_length=200)
    description: str
    status: ProjectStatus
    health: Health
    manager_user_id: str
    start_date: date
    end_date: date
    tags: list[str]
    knowledge_source_ids: list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
    schema_version: int = 1

class Milestone(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    milestone_id: str
    tenant_id: str
    project_id: str
    name: str
    description: str
    status: MilestoneStatus
    health: Health
    target_date: date
    completed_at: date | None = None
    owner_user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
