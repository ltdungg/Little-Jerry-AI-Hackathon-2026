"""DynamoDB access for the BusinessData single-table (single-tenant AIV).

Simplified single-tenant key pattern:
  Project : PK=TENANT#<tenant>                       SK=PROJECT#<projectId>
  Task    : PK=TENANT#<tenant>#PROJECT#<projectId>   SK=TASK#<taskId>
  Risk    : PK=TENANT#<tenant>#PROJECT#<projectId>   SK=RISK#<riskId>
  Milestone: PK=TENANT#<tenant>#PROJECT#<projectId>  SK=MILESTONE#<milestoneId>
  Report   : PK=TENANT#<tenant>#PROJECT#<projectId>  SK=REPORT#<createdAt>#<reportId>
  DailyUpdate: PK=TENANT#<tenant>#PROJECT#<projectId> SK=DAILYUPDATE#<date>#<userId>
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

    # ---------- Aggregated Metrics (Hybrid: computed from Jira, stored here) ----------
    def put_project_metrics(self, metrics: dict[str, Any]) -> None:
        """Store aggregated project metrics computed from Jira data."""
        item = {
            **metrics,
            "PK": f"TENANT#{self.tenant_id}#PROJECT#{metrics['project_id']}",
            "SK": "METRICS",
        }
        self.table.put_item(Item=item)

    def get_project_metrics(self, project_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": "METRICS"}
        )
        return resp.get("Item")

    def update_task(self, project_id: str, task_id: str, updates: dict[str, Any]) -> None:
        expr_names = {f"#{k}": k for k in updates}
        expr_values = {f":{k}": v for k, v in updates.items()}
        self.table.update_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"TASK#{task_id}"},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
        )

    def get_task(self, project_id: str, task_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"TASK#{task_id}"}
        )
        return resp.get("Item")

    def list_tasks_by_assignee(self, user_id: str) -> list[dict[str, Any]]:
        """Cross-project lookup for 'my tasks' pages. No dedicated GSI yet, so
        this fans out over known projects (same pattern as list_all_tasks)."""
        return [t for t in self.list_all_tasks() if t.get("assignee", {}).get("user_id") == user_id]

    def add_task_comment(self, project_id: str, task_id: str, comment: dict[str, Any]) -> None:
        self.table.update_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"TASK#{task_id}"},
            UpdateExpression="SET #comments = list_append(if_not_exists(#comments, :empty), :c)",
            ExpressionAttributeNames={"#comments": "comments"},
            ExpressionAttributeValues={":c": [comment], ":empty": []},
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

    # ---------- Reports (daily/weekly/manual — docs/REPORT-EXPORT-SPEC.md) ----------
    def list_reports(self, project_id: str, category_filter: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("REPORT#"),
            ScanIndexForward=False,
        )
        items = resp.get("Items", [])
        if category_filter:
            items = [r for r in items if r.get("category") == category_filter]
        return items

    def list_all_reports(self, category_filter: str | None = None) -> list[dict[str, Any]]:
        all_reports: list[dict[str, Any]] = []
        for p in self.list_projects():
            pid = p.get("project_id", "")
            if pid:
                all_reports.extend(self.list_reports(pid, category_filter=category_filter))
        return all_reports

    def get_report(self, project_id: str, report_id: str) -> dict[str, Any] | None:
        for r in self.list_reports(project_id):
            if r.get("report_id") == report_id:
                return r
        return None

    def get_report_by_id(self, report_id: str) -> dict[str, Any] | None:
        """Report SK embeds created_at, so a bare report_id needs a bounded
        fan-out over known projects (same shape as list_all_tasks/list_all_risks)."""
        for p in self.list_projects():
            pid = p.get("project_id", "")
            if not pid:
                continue
            for r in self.list_reports(pid):
                if r.get("report_id") == report_id:
                    return r
        return None

    def put_report(self, project_id: str, report: dict[str, Any]) -> None:
        item = {
            **report,
            "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}",
            "SK": f"REPORT#{report['created_at']}#{report['report_id']}",
        }
        self.table.put_item(Item=item)

    def update_report(self, project_id: str, report_id: str, updates: dict[str, Any]) -> None:
        report = self.get_report(project_id, report_id)
        if not report:
            raise ValueError(f"report {report_id} not found in project {project_id}")
        self._update_item(f"TENANT#{self.tenant_id}#PROJECT#{project_id}", report["SK"], updates)

    # ---------- Daily updates (cập nhật tiến độ task hằng ngày, theo dự án) ----------
    def list_daily_updates(self, project_id: str, date: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("DAILYUPDATE#")
        )
        items = resp.get("Items", [])
        if date:
            items = [u for u in items if u.get("date") == date]
        return items

    def put_daily_update(self, project_id: str, update: dict[str, Any]) -> None:
        item = {
            **update,
            "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}",
            "SK": f"DAILYUPDATE#{update['date']}#{update['user_id']}",
        }
        self.table.put_item(Item=item)

    # ---------- Issues ----------
    def list_issues(self, project_id: str, status_filter: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("ISSUE#")
        )
        items = resp.get("Items", [])
        if status_filter:
            items = [i for i in items if i.get("status") == status_filter]
        return items

    def list_all_issues(self) -> list[dict[str, Any]]:
        all_issues: list[dict[str, Any]] = []
        for p in self.list_projects():
            pid = p.get("project_id", "")
            if pid:
                all_issues.extend(self.list_issues(pid))
        return all_issues

    def get_issue(self, project_id: str, issue_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"ISSUE#{issue_id}"}
        )
        return resp.get("Item")

    def put_issue(self, project_id: str, issue: dict[str, Any]) -> None:
        item = {**issue, "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"ISSUE#{issue['issue_id']}"}
        self.table.put_item(Item=item)

    def update_issue(self, project_id: str, issue_id: str, updates: dict[str, Any]) -> None:
        expr_values = {f":{k}": v for k, v in updates.items()}
        self.table.update_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"ISSUE#{issue_id}"},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
            ExpressionAttributeNames={f"#{k}": k for k in updates},
            ExpressionAttributeValues=expr_values,
        )

    # ---------- Decisions ----------
    def list_decisions(self, project_id: str, approval_status_filter: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#PROJECT#{project_id}") & Key("SK").begins_with("DECISION#")
        )
        items = resp.get("Items", [])
        if approval_status_filter:
            items = [d for d in items if d.get("approval_status") == approval_status_filter]
        return items

    def list_all_decisions(self) -> list[dict[str, Any]]:
        all_decisions: list[dict[str, Any]] = []
        for p in self.list_projects():
            pid = p.get("project_id", "")
            if pid:
                all_decisions.extend(self.list_decisions(pid))
        return all_decisions

    def get_decision(self, project_id: str, decision_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"DECISION#{decision_id}"}
        )
        return resp.get("Item")

    def put_decision(self, project_id: str, decision: dict[str, Any]) -> None:
        item = {**decision, "PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"DECISION#{decision['decision_id']}"}
        self.table.put_item(Item=item)

    def update_decision(self, project_id: str, decision_id: str, updates: dict[str, Any]) -> None:
        expr_values = {f":{k}": v for k, v in updates.items()}
        self.table.update_item(
            Key={"PK": f"TENANT#{self.tenant_id}#PROJECT#{project_id}", "SK": f"DECISION#{decision_id}"},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
            ExpressionAttributeNames={f"#{k}": k for k in updates},
            ExpressionAttributeValues=expr_values,
        )

    # ---------- Notifications (per-user) ----------
    def list_notifications(self, user_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#USER#{user_id}") & Key("SK").begins_with("NOTIF#"),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    def put_notification(self, user_id: str, notification: dict[str, Any]) -> None:
        item = {
            **notification,
            "PK": f"TENANT#{self.tenant_id}#USER#{user_id}",
            "SK": f"NOTIF#{notification['created_at']}#{notification['notification_id']}",
        }
        self.table.put_item(Item=item)

    def mark_notification_read(self, user_id: str, created_at: str, notification_id: str) -> None:
        self.table.update_item(
            Key={"PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": f"NOTIF#{created_at}#{notification_id}"},
            UpdateExpression="SET #is_read = :true",
            ExpressionAttributeNames={"#is_read": "is_read"},
            ExpressionAttributeValues={":true": True},
        )

    def mark_all_notifications_read(self, user_id: str) -> None:
        for n in self.list_notifications(user_id):
            if not n.get("is_read"):
                self.mark_notification_read(user_id, n["SK"].split("#", 2)[1], n["notification_id"])

    # ---------- Activity log (tenant-wide, newest first) ----------
    def list_activity_log(self, action_filter: str | None = None) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("ACTIVITY#"),
            ScanIndexForward=False,
        )
        items = resp.get("Items", [])
        if action_filter:
            items = [a for a in items if a.get("action") == action_filter]
        return items

    def put_activity_log(self, entry: dict[str, Any]) -> None:
        item = {
            **entry,
            "PK": f"TENANT#{self.tenant_id}",
            "SK": f"ACTIVITY#{entry['created_at']}#{entry['log_id']}",
        }
        self.table.put_item(Item=item)

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

    # ---------- Generic tenant-wide item helpers ----------
    def _update_item(self, pk: str, sk: str, updates: dict[str, Any]) -> None:
        self.table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
            ExpressionAttributeNames={f"#{k}": k for k in updates},
            ExpressionAttributeValues={f":{k}": v for k, v in updates.items()},
        )

    # ---------- Teams ----------
    def list_teams(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("TEAM#")
        )
        return resp.get("Items", [])

    def get_team(self, team_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(Key={"PK": f"TENANT#{self.tenant_id}", "SK": f"TEAM#{team_id}"})
        return resp.get("Item")

    def put_team(self, team: dict[str, Any]) -> None:
        item = {**team, "PK": f"TENANT#{self.tenant_id}", "SK": f"TEAM#{team['team_id']}"}
        self.table.put_item(Item=item)

    # ---------- User profiles (members / admin users) ----------
    def list_user_profiles(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("USERPROFILE#")
        )
        return resp.get("Items", [])

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(Key={"PK": f"TENANT#{self.tenant_id}", "SK": f"USERPROFILE#{user_id}"})
        return resp.get("Item")

    def put_user_profile(self, profile: dict[str, Any]) -> None:
        item = {**profile, "PK": f"TENANT#{self.tenant_id}", "SK": f"USERPROFILE#{profile['user_id']}"}
        self.table.put_item(Item=item)

    def update_user_profile(self, user_id: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}", f"USERPROFILE#{user_id}", updates)

    # ---------- Weekly updates (per user) + team weekly reports ----------
    def list_weekly_updates(self, user_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#USER#{user_id}") & Key("SK").begins_with("UPDATE#"),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    def put_weekly_update(self, user_id: str, update: dict[str, Any]) -> None:
        item = {**update, "PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": f"UPDATE#{update['week']}"}
        self.table.put_item(Item=item)

    def update_weekly_update(self, user_id: str, week: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}#USER#{user_id}", f"UPDATE#{week}", updates)

    def list_team_reports(self, team_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#TEAM#{team_id}") & Key("SK").begins_with("REPORT#"),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    def list_all_team_reports(self) -> list[dict[str, Any]]:
        """Latest report per team, for the team-reports list page and leadership summary."""
        reports: list[dict[str, Any]] = []
        for t in self.list_teams():
            team_reports = self.list_team_reports(t["team_id"])
            if team_reports:
                reports.append(team_reports[0])
        return reports

    def put_team_report(self, team_id: str, report: dict[str, Any]) -> None:
        item = {**report, "PK": f"TENANT#{self.tenant_id}#TEAM#{team_id}", "SK": f"REPORT#{report['week']}"}
        self.table.put_item(Item=item)

    def update_team_report(self, team_id: str, week: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}#TEAM#{team_id}", f"REPORT#{week}", updates)

    # ---------- Meetings ----------
    def list_meetings(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("MEETING#")
        )
        return resp.get("Items", [])

    def get_meeting(self, meeting_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(Key={"PK": f"TENANT#{self.tenant_id}", "SK": f"MEETING#{meeting_id}"})
        return resp.get("Item")

    def put_meeting(self, meeting: dict[str, Any]) -> None:
        item = {**meeting, "PK": f"TENANT#{self.tenant_id}", "SK": f"MEETING#{meeting['meeting_id']}"}
        self.table.put_item(Item=item)

    def update_meeting(self, meeting_id: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}", f"MEETING#{meeting_id}", updates)

    # ---------- Knowledge documents (curated view) ----------
    def list_knowledge_documents(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("KDOC#")
        )
        return resp.get("Items", [])

    def get_knowledge_document(self, doc_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(Key={"PK": f"TENANT#{self.tenant_id}", "SK": f"KDOC#{doc_id}"})
        return resp.get("Item")

    def put_knowledge_document(self, document: dict[str, Any]) -> None:
        item = {**document, "PK": f"TENANT#{self.tenant_id}", "SK": f"KDOC#{document['document_id']}"}
        self.table.put_item(Item=item)

    def update_knowledge_document(self, doc_id: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}", f"KDOC#{doc_id}", updates)

    # ---------- Handoff / offboarding ----------
    def list_handoffs(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("HANDOFF#")
        )
        return resp.get("Items", [])

    def put_handoff(self, handoff: dict[str, Any]) -> None:
        item = {**handoff, "PK": f"TENANT#{self.tenant_id}", "SK": f"HANDOFF#{handoff['handoff_id']}"}
        self.table.put_item(Item=item)

    def update_handoff(self, handoff_id: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}", f"HANDOFF#{handoff_id}", updates)

    def list_offboarding_records(self) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}") & Key("SK").begins_with("OFFBOARDING#")
        )
        return resp.get("Items", [])

    def put_offboarding_record(self, record: dict[str, Any]) -> None:
        item = {**record, "PK": f"TENANT#{self.tenant_id}", "SK": f"OFFBOARDING#{record['offboarding_id']}"}
        self.table.put_item(Item=item)

    def update_offboarding_record(self, offboarding_id: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}", f"OFFBOARDING#{offboarding_id}", updates)

    # ---------- Role permission matrix (single config item for the tenant) ----------
    def get_role_permissions(self) -> list[dict[str, Any]]:
        resp = self.table.get_item(Key={"PK": f"TENANT#{self.tenant_id}", "SK": "ROLE_PERMISSIONS"})
        item = resp.get("Item")
        return item.get("rows", []) if item else []

    def put_role_permissions(self, rows: list[dict[str, Any]]) -> None:
        self.table.put_item(Item={"PK": f"TENANT#{self.tenant_id}", "SK": "ROLE_PERMISSIONS", "rows": rows})

    # ---------- Onboarding content (tenant default) + per-user checklist ----------
    def get_onboarding_content(self) -> dict[str, Any] | None:
        resp = self.table.get_item(Key={"PK": f"TENANT#{self.tenant_id}", "SK": "ONBOARDING#default"})
        return resp.get("Item")

    def put_onboarding_content(self, content: dict[str, Any]) -> None:
        item = {**content, "PK": f"TENANT#{self.tenant_id}", "SK": "ONBOARDING#default"}
        self.table.put_item(Item=item)

    def get_onboarding_checklist(self, user_id: str) -> list[dict[str, Any]]:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": "ONBOARDING_CHECKLIST"}
        )
        item = resp.get("Item")
        return item.get("items", []) if item else []

    def put_onboarding_checklist(self, user_id: str, items: list[dict[str, Any]]) -> None:
        self.table.put_item(Item={
            "PK": f"TENANT#{self.tenant_id}#USER#{user_id}",
            "SK": "ONBOARDING_CHECKLIST",
            "items": items,
        })

    # ---------- Chat sessions + saved answers (assistant history) ----------
    def list_chat_sessions(self, user_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#USER#{user_id}") & Key("SK").begins_with("SESSION#"),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    def get_chat_session(self, user_id: str, session_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(
            Key={"PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": f"SESSION#{session_id}"}
        )
        return resp.get("Item")

    def put_chat_session(self, user_id: str, session: dict[str, Any]) -> None:
        item = {**session, "PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": f"SESSION#{session['session_id']}"}
        self.table.put_item(Item=item)

    def update_chat_session(self, user_id: str, session_id: str, updates: dict[str, Any]) -> None:
        self._update_item(f"TENANT#{self.tenant_id}#USER#{user_id}", f"SESSION#{session_id}", updates)

    def list_saved_answers(self, user_id: str) -> list[dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"TENANT#{self.tenant_id}#USER#{user_id}") & Key("SK").begins_with("SAVED#"),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    def put_saved_answer(self, user_id: str, saved: dict[str, Any]) -> None:
        item = {**saved, "PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": f"SAVED#{saved['saved_id']}"}
        self.table.put_item(Item=item)

    def delete_saved_answer(self, user_id: str, saved_id: str) -> None:
        self.table.delete_item(Key={"PK": f"TENANT#{self.tenant_id}#USER#{user_id}", "SK": f"SAVED#{saved_id}"})
