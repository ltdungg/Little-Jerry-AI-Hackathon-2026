from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4

class ArtifactType(str, Enum):
    report = "report"
    document = "document"
    slack_message = "slack_message"
    other = "other"

class Artifact(BaseModel):
    artifact_id: UUID = Field(default_factory=uuid4)
    artifact_type: ArtifactType
    title: str
    s3_uri: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
