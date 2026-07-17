from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from agents.common.contracts.common import ProjectStatus, Health, MilestoneStatus

class Program(BaseModel):
    program_id: str
    tenant_id: str
    name: str
    description: str
    status: ProjectStatus
    owner_user_id: str
    start_date: datetime
    end_date: datetime

class Project(BaseModel):
    project_id: str
    tenant_id: str
    program_id: str
    code: str
    name: str
    description: str
    status: ProjectStatus
    health: Health
    manager_user_id: str
    start_date: datetime
    end_date: datetime
    tags: List[str]
    knowledge_source_ids: List[str]

class Milestone(BaseModel):
    milestone_id: str
    tenant_id: str
    project_id: str
    name: str
    description: str
    status: MilestoneStatus
    health: Health
    target_date: datetime
    completed_at: Optional[datetime] = None
    owner_user_id: str
