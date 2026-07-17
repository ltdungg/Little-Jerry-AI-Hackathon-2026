"""Seed BusinessData table with demo data for the single-tenant AIV deployment.

Usage: uv run python scripts/seed_dynamodb.py
Requires AWS credentials + BUSINESS_TABLE env (defaults to npo-ai-dev-business-data).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("BUSINESS_TABLE", "npo-ai-dev-business-data")
os.environ.setdefault("AWS_REGION", "ap-southeast-2")

from agents.common.clients.dynamodb_client import BusinessDataClient  # noqa: E402

TENANT = "aiv"

PROJECTS = [
    {
        "project_id": "proj-green-hope",
        "name": "Green Hope Environmental Initiative",
        "program_name": "Chương trình Phủ xanh Việt Nam",
        "description": "Community environmental restoration and sustainability program",
        "status": "active",
        "health": "amber",
        "manager": {"user_id": "user-minh", "display_name": "Minh Nguyen"},
        "overdue_task_count": 1,
        "high_risk_count": 1,
        "start_date": "2025-09-01",
        "end_date": "2026-08-31",
        "tags": ["community", "environment"],
        "updated_at": "2026-07-17T00:00:00Z",
    },
    {
        "project_id": "proj-ocean-rescue",
        "name": "Ocean Rescue Marine Conservation",
        "program_name": "Chương trình Làm sạch Đại dương",
        "description": "Marine ecosystem protection and coastal cleanup operations",
        "status": "active",
        "health": "green",
        "manager": {"user_id": "user-sarah", "display_name": "Sarah Pham"},
        "overdue_task_count": 0,
        "high_risk_count": 0,
        "start_date": "2025-11-01",
        "end_date": "2026-10-31",
        "tags": ["ocean", "conservation"],
        "updated_at": "2026-07-17T00:00:00Z",
    },
]

TASKS = [
    {"task_id": "task-001", "project_id": "proj-green-hope", "title": "Finalize volunteer schedule", "status": "done", "priority": "medium", "due_date": "2026-02-15", "assignee": {"user_id": "user-sarah", "display_name": "Sarah Pham"}, "version": 1, "updated_at": "2026-02-10T00:00:00Z", "allowed_actions": []},
    {"task_id": "task-002", "project_id": "proj-green-hope", "title": "Submit grant application", "status": "in_progress", "priority": "high", "due_date": "2026-08-01", "assignee": {"user_id": "user-minh", "display_name": "Minh Nguyen"}, "version": 1, "updated_at": "2026-07-10T00:00:00Z", "allowed_actions": ["update"]},
    {"task_id": "task-004", "project_id": "proj-green-hope", "title": "Prepare quarterly report", "status": "todo", "priority": "critical", "due_date": "2026-06-01", "is_overdue": True, "assignee": {"user_id": "user-lina", "display_name": "Lina Le"}, "version": 1, "updated_at": "2026-06-01T00:00:00Z", "allowed_actions": ["update"]},
    {"task_id": "task-003", "project_id": "proj-ocean-rescue", "title": "Conduct site assessment", "status": "todo", "priority": "medium", "due_date": "2026-09-10", "assignee": {"user_id": "user-sarah", "display_name": "Sarah Pham"}, "version": 1, "updated_at": "2026-07-01T00:00:00Z", "allowed_actions": ["update"]},
]

RISKS = [
    {"risk_id": "risk-001", "project_id": "proj-green-hope", "title": "Volunteer attrition during summer", "status": "open", "category": "staffing", "likelihood": 4, "impact": 4, "score": 16, "severity": "high", "owner": {"user_id": "user-minh", "display_name": "Minh Nguyen"}, "mitigation": "Recruit backup volunteers", "review_date": "2026-08-01"},
    {"risk_id": "risk-002", "project_id": "proj-ocean-rescue", "title": "Funding gap for Q3", "status": "mitigating", "category": "finance", "likelihood": 3, "impact": 3, "score": 9, "severity": "medium", "owner": {"user_id": "user-sarah", "display_name": "Sarah Pham"}, "mitigation": "Apply for emergency grant", "review_date": "2026-09-01"},
]

MILESTONES = [
    {"milestone_id": "mil-001", "project_id": "proj-green-hope", "name": "Training rollout completed", "status": "in_progress", "health": "amber", "target_date": "2026-09-30", "owner": {"user_id": "user-minh", "display_name": "Minh Nguyen"}},
    {"milestone_id": "mil-002", "project_id": "proj-ocean-rescue", "name": "Coastal cleanup phase 1", "status": "not_started", "health": "green", "target_date": "2026-10-15", "owner": {"user_id": "user-sarah", "display_name": "Sarah Pham"}},
]


def main() -> None:
    client = BusinessDataClient(tenant_id=TENANT)
    for p in PROJECTS:
        client.put_project(p)
        print("project:", p["project_id"])
    for t in TASKS:
        client.put_task(t["project_id"], t)
        print("task:", t["task_id"])
    for r in RISKS:
        client.put_risk(r["project_id"], r)
        print("risk:", r["risk_id"])
    for m in MILESTONES:
        client.put_milestone(m["project_id"], m)
        print("milestone:", m["milestone_id"])
    print("Seed complete.")


if __name__ == "__main__":
    main()
