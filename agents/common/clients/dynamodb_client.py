"""DynamoDB access for the BusinessData single-table (single-tenant AIV).

Simplified single-tenant key pattern:
  Project : PK=TENANT#<tenant>                       SK=PROJECT#<projectId>
  Task    : PK=TENANT#<tenant>#PROJECT#<projectId>   SK=TASK#<taskId>
  Risk    : PK=TENANT#<tenant>#PROJECT#<projectId>   SK=RISK#<riskId>
  Milestone: PK=TENANT#<tenant>#PROJECT#<projectId>  SK=MILESTONE#<milestoneId>
"""
import os
from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key


def _table():
    table_name = os.environ.get("BUSINESS_TABLE", "BusinessData")
    region = os.environ.get("AWS_REGION", "ap-southeast-2")
    return boto3.resource("dynamodb", region_name=region).Table(table_name)


class BusinessDataClient:
    def __init__(self, tenant_id: str = "aiv"):
        self.tenant_id = tenant_id
        self.table = _table()

    # ---------- Projects ----------
    def list_projects(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("PROJECT#")
        )
        return resp.get("Items", [])

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}", "SK": f"PROJECT#{project_id}"}
        )
        return resp.get("Item")

    def put_project(self, project: dict[str, Any]) -> None:
        item = {**project, "PK": f"TENANT#{self.tenant_id}", "SK": f"PROJECT#{project['project_id']}"}
        self.table.put_item(Item=item)

    # ---------- Tasks ----------
    def list_tasks(self, project_id: str, status_filter: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("TASK#")
        )
        items = resp.get("Items", [])
        if status_filter:
            items = [i for i in items if i.get("status") == status_filter]
        return items

    def list_overdue_tasks(self, project_id: str | None = None) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc).date().isoformat()
        projects = [project_id] if project_id else [p["project_id"] for p in self.list_projects()]
        overdue: list[dict[str, Any]] = []
        for pid in projects:
            for t in self.list_tasks(pid):
                due = t.get("due_date")
                if due and due < now and t.get("status") not in ("done", "cancelled", "completed"):
                    overdue.append(t)
        return overdue

    def put_task(self, project_id: str, task: dict[str, Any]) -> None:
        item = {**task, "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"TASK#{task['task_id']}"}
        self.table.put_item(Item=item)

    def update_task(self, project_id: str, task_id: str, updates: dict[str, Any]) -> None:
        expr_names = {f"#{k}": k for k in updates}
        expr_values = {f":{k}": v for k, v in updates.items()}
        self.table.update_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"TASK#{task_id}"},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
        )

    # ---------- Risks ----------
    def list_risks(self, project_id: str, severity_filter: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("RISK#")
        )
        items = resp.get("Items", [])
        if severity_filter:
            items = [i for i in items if i.get("severity") == severity_filter]
        return items

    def put_risk(self, project_id: str, risk: dict[str, Any]) -> None:
        item = {**risk, "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"RISK#{risk['risk_id']}"}
        self.table.put_item(Item=item)

    # ---------- Milestones ----------
    def list_milestones(self, project_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("MILESTONE#")
        )
        return resp.get("Items", [])

    def put_milestone(self, project_id: str, milestone: dict[str, Any]) -> None:
        item = {**milestone, "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"MILESTONE#{milestone['milestone_id']}"}
        self.table.put_item(Item=item)

    # ---------- Reports ----------
    def list_reports(self, project_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("REPORT#")
        )
        return resp.get("Items", [])

    # ---------- Cross-project queries (for Risk Analysis Agent) ----------
    def list_all_risks(self) -> list[dict[str, Any]]:
        """List all risks across all projects for cross-project risk analysis."""
        projects = self.list_projects()
        all_risks: list[dict[str, Any]] = []
        for p in projects:
            pid = p.get("project_id", "")
            if pid:
                all_risks.extend(self.list_risks(pid))
        return all_risks

    def list_all_tasks(self) -> list[dict[str, Any]]:
        """List all tasks across all projects."""
        projects = self.list_projects()
        all_tasks: list[dict[str, Any]] = []
        for p in projects:
            pid = p.get("project_id", "")
            if pid:
                all_tasks.extend(self.list_tasks(pid))
        return all_tasks
