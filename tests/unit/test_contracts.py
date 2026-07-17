import pytest
from pydantic import BaseModel, Field
from uuid import UUID

# Assuming your models are here: from npo_platform.contracts import Task

class TaskContract(BaseModel):
    id: UUID
    title: str = Field(..., min_length=1)
    description: str | None = None
    priority: int = 1

def test_task_serialization():
    data = {"id": "550e8400-e29b-41d4-a716-446655440000", "title": "Test Task"}
    task = TaskContract(**data)
    assert task.id == UUID("550e8400-e29b-41d4-a716-446655440000")
    assert task.priority == 1

def test_task_missing_required_field():
    with pytest.raises(Exception):
        TaskContract(id="550e8400-e29b-41d4-a716-446655440000")
