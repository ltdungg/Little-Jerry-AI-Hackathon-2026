import json
import os
import re
import uuid
import boto3
import structlog
from datetime import datetime, timezone
from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.clients.workflow_client import WorkflowStateClient
from lambdas.common.utils import parse_body, build_response, build_error_response, extract_claims, build_request_context

logger = structlog.get_logger()

REGION = os.environ.get("REGION", "ap-southeast-2")
ORCHESTRATOR_RUNTIME_ARN = os.environ.get("ORCHESTRATOR_RUNTIME_ARN", "")
_agentcore = boto3.client("bedrock-agentcore", region_name=REGION)
_cognito = boto3.client("cognito-idp", region_name=REGION)
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")

PROJECT_TASKS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/?$")
PROJECT_TASK_PROPOSALS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/proposals/?$")
PROJECT_TASK_COMMENTS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/([^/]+)/comments/?$")
PROJECT_TASK_DETAIL_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/([^/]+)/?$")
PROJECT_RISKS_RE = re.compile(r"^/v1/projects/([^/]+)/risks/?$")
PROJECT_MILESTONES_RE = re.compile(r"^/v1/projects/([^/]+)/milestones/?$")
PROJECT_ISSUES_RE = re.compile(r"^/v1/projects/([^/]+)/issues/?$")
PROJECT_DECISIONS_RE = re.compile(r"^/v1/projects/([^/]+)/decisions/?$")
PROJECT_DETAIL_RE = re.compile(r"^/v1/projects/([^/]+)/?$")

ISSUE_DETAIL_RE = re.compile(r"^/v1/issues/([^/]+)/?$")
DECISION_DETAIL_RE = re.compile(r"^/v1/decisions/([^/]+)/?$")
ME_NOTIFICATION_READ_RE = re.compile(r"^/v1/me/notifications/([^/]+)/read/?$")

WORKFLOW_CONFIRM_RE = re.compile(r"^/v1/workflows/([^/]+)/confirm/?$")
WORKFLOW_CANCEL_RE = re.compile(r"^/v1/workflows/([^/]+)/cancel/?$")
WORKFLOW_DETAIL_RE = re.compile(r"^/v1/workflows/([^/]+)/?$")
REPORT_DETAIL_RE = re.compile(r"^/v1/reports/([^/]+)/?$")

TEAM_DETAIL_RE = re.compile(r"^/v1/teams/([^/]+)/?$")
TEAM_REPORTS_RE = re.compile(r"^/v1/teams/([^/]+)/reports/?$")
TEAM_REPORT_REMIND_RE = re.compile(r"^/v1/teams/([^/]+)/reports/([^/]+)/remind/?$")
TEAM_REPORT_APPROVE_RE = re.compile(r"^/v1/teams/([^/]+)/reports/([^/]+)/approve/?$")
TEAM_REPORT_PUBLISH_RE = re.compile(r"^/v1/teams/([^/]+)/reports/([^/]+)/publish/?$")

USER_DETAIL_RE = re.compile(r"^/v1/users/([^/]+)/?$")

ME_UPDATE_SUBMIT_RE = re.compile(r"^/v1/me/updates/([^/]+)/submit/?$")

MEETING_DETAIL_RE = re.compile(r"^/v1/meetings/([^/]+)/?$")
MEETING_ACTION_ITEM_RE = re.compile(r"^/v1/meetings/([^/]+)/action-items/([^/]+)/(confirm|reject)/?$")

DOCUMENT_DETAIL_RE = re.compile(r"^/v1/documents/([^/]+)/?$")

HANDOFF_DETAIL_RE = re.compile(r"^/v1/handoffs/([^/]+)/?$")
OFFBOARDING_CONFIRM_RE = re.compile(r"^/v1/offboarding/([^/]+)/confirm-handoff-complete/?$")

ME_SAVED_ANSWER_DETAIL_RE = re.compile(r"^/v1/me/saved-answers/([^/]+)/?$")
ME_CHAT_SESSION_DETAIL_RE = re.compile(r"^/v1/me/chat-sessions/([^/]+)/?$")

ONBOARDING_CHECKLIST_TOGGLE_RE = re.compile(r"^/v1/onboarding/checklist/([^/]+)/toggle/?$")


def lambda_handler(event, context):
    path = event.get("requestContext", {}).get("http", {}).get("path", "")
    method = event.get("requestContext", {}).get("http", {}).get("method", "")

    claims = extract_claims(event)
    request_ctx = build_request_context(claims, event)

    logger.info("processing_request", path=path, method=method, user_id=request_ctx.user_id)

    try:
        if path == "/health" and method == "GET":
            return build_response(200, {"status": "ok"})
        elif path == "/v1/me" and method == "GET":
            return handle_me(event, request_ctx)
        elif path == "/v1/chat" and method == "POST":
            return handle_chat(event, request_ctx)
        elif path == "/v1/workflows" and method == "POST":
            return handle_create_workflow(event, request_ctx)
        elif (m := WORKFLOW_CONFIRM_RE.match(path)) and method == "POST":
            return handle_confirm_workflow(event, request_ctx, m.group(1))
        elif (m := WORKFLOW_CANCEL_RE.match(path)) and method == "POST":
            return handle_cancel_workflow(event, request_ctx, m.group(1))
        elif (m := WORKFLOW_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_workflow(event, request_ctx, m.group(1))
        elif path == "/v1/reports/leadership-summary" and method == "GET":
            return handle_leadership_summary(event, request_ctx)
        elif (m := REPORT_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_report(event, request_ctx, m.group(1))
        elif path == "/v1/projects" and method == "GET":
            return handle_list_projects(event, request_ctx)
        elif path == "/v1/tasks" and method == "GET":
            return handle_list_all_tasks(event, request_ctx)
        elif path == "/v1/me/tasks" and method == "GET":
            return handle_list_my_tasks(event, request_ctx)
        elif path == "/v1/me/notifications" and method == "GET":
            return handle_list_notifications(event, request_ctx)
        elif path == "/v1/me/notifications/read-all" and method == "POST":
            return handle_mark_all_notifications_read(event, request_ctx)
        elif (m := ME_NOTIFICATION_READ_RE.match(path)) and method == "POST":
            return handle_mark_notification_read(event, request_ctx, m.group(1))
        elif path == "/v1/issues" and method == "GET":
            return handle_list_all_issues(event, request_ctx)
        elif (m := ISSUE_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_update_issue(event, request_ctx, m.group(1))
        elif (m := ISSUE_DETAIL_RE.match(path)) and method == "DELETE":
            return handle_dismiss_issue(event, request_ctx, m.group(1))
        elif path == "/v1/decisions" and method == "GET":
            return handle_list_all_decisions(event, request_ctx)
        elif (m := DECISION_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_update_decision(event, request_ctx, m.group(1))
        elif path == "/v1/activity-log" and method == "GET":
            return handle_list_activity_log(event, request_ctx)
        elif path == "/v1/teams" and method == "GET":
            return handle_list_teams(event, request_ctx)
        elif (m := TEAM_REPORT_REMIND_RE.match(path)) and method == "POST":
            return handle_remind_team_report(event, request_ctx, m.group(1), m.group(2))
        elif (m := TEAM_REPORT_APPROVE_RE.match(path)) and method == "POST":
            return handle_approve_team_report(event, request_ctx, m.group(1), m.group(2))
        elif (m := TEAM_REPORT_PUBLISH_RE.match(path)) and method == "POST":
            return handle_publish_team_report(event, request_ctx, m.group(1), m.group(2))
        elif (m := TEAM_REPORTS_RE.match(path)) and method == "GET":
            return handle_list_team_reports(event, request_ctx, m.group(1))
        elif path == "/v1/team-reports" and method == "GET":
            return handle_list_all_team_reports(event, request_ctx)
        elif (m := TEAM_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_team(event, request_ctx, m.group(1))
        elif path == "/v1/users" and method == "GET":
            return handle_list_users(event, request_ctx)
        elif (m := USER_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_update_user(event, request_ctx, m.group(1))
        elif path == "/v1/me/updates/current" and method == "GET":
            return handle_get_my_current_update(event, request_ctx)
        elif path == "/v1/me/updates" and method == "GET":
            return handle_list_my_updates(event, request_ctx)
        elif path == "/v1/me/updates" and method == "PUT":
            return handle_save_update_draft(event, request_ctx)
        elif (m := ME_UPDATE_SUBMIT_RE.match(path)) and method == "POST":
            return handle_submit_update(event, request_ctx, m.group(1))
        elif path == "/v1/meetings" and method == "GET":
            return handle_list_meetings(event, request_ctx)
        elif (m := MEETING_ACTION_ITEM_RE.match(path)) and method == "POST":
            return handle_meeting_action_item(event, request_ctx, m.group(1), m.group(2), m.group(3))
        elif (m := MEETING_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_meeting(event, request_ctx, m.group(1))
        elif path == "/v1/documents" and method == "GET":
            return handle_list_documents(event, request_ctx)
        elif (m := DOCUMENT_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_update_document(event, request_ctx, m.group(1))
        elif path == "/v1/handoffs" and method == "GET":
            return handle_list_handoffs(event, request_ctx)
        elif (m := HANDOFF_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_update_handoff(event, request_ctx, m.group(1))
        elif path == "/v1/offboarding" and method == "GET":
            return handle_list_offboarding(event, request_ctx)
        elif (m := OFFBOARDING_CONFIRM_RE.match(path)) and method == "POST":
            return handle_confirm_offboarding_handoff(event, request_ctx, m.group(1))
        elif path == "/v1/roles/permissions" and method == "GET":
            return handle_get_role_permissions(event, request_ctx)
        elif path == "/v1/roles/permissions" and method == "PATCH":
            return handle_toggle_role_permission(event, request_ctx)
        elif path == "/v1/onboarding" and method == "GET":
            return handle_get_onboarding(event, request_ctx)
        elif (m := ONBOARDING_CHECKLIST_TOGGLE_RE.match(path)) and method == "POST":
            return handle_toggle_onboarding_checklist(event, request_ctx, m.group(1))
        elif path == "/v1/me/chat-sessions" and method == "GET":
            return handle_list_chat_sessions(event, request_ctx)
        elif (m := ME_CHAT_SESSION_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_rename_chat_session(event, request_ctx, m.group(1))
        elif path == "/v1/me/saved-answers" and method == "GET":
            return handle_list_saved_answers(event, request_ctx)
        elif path == "/v1/me/saved-answers" and method == "POST":
            return handle_save_answer(event, request_ctx)
        elif (m := ME_SAVED_ANSWER_DETAIL_RE.match(path)) and method == "DELETE":
            return handle_delete_saved_answer(event, request_ctx, m.group(1))
        elif (m := PROJECT_TASK_PROPOSALS_RE.match(path)) and method == "POST":
            return handle_create_task_proposal(event, request_ctx, m.group(1))
        elif (m := PROJECT_TASK_COMMENTS_RE.match(path)) and method == "POST":
            return handle_add_task_comment(event, request_ctx, m.group(1), m.group(2))
        elif (m := PROJECT_TASKS_RE.match(path)) and method == "GET":
            return handle_list_tasks(event, request_ctx, m.group(1))
        elif (m := PROJECT_TASK_DETAIL_RE.match(path)) and method == "PATCH":
            return handle_update_task(event, request_ctx, m.group(1), m.group(2))
        elif (m := PROJECT_RISKS_RE.match(path)) and method == "GET":
            return handle_list_risks(event, request_ctx, m.group(1))
        elif (m := PROJECT_MILESTONES_RE.match(path)) and method == "GET":
            return handle_list_milestones(event, request_ctx, m.group(1))
        elif (m := PROJECT_ISSUES_RE.match(path)) and method == "GET":
            return handle_list_issues(event, request_ctx, m.group(1))
        elif (m := PROJECT_DECISIONS_RE.match(path)) and method == "GET":
            return handle_list_decisions(event, request_ctx, m.group(1))
        elif (m := PROJECT_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_project(event, request_ctx, m.group(1))
        elif path == "/v1/admin/auth/jira/login" and method == "GET":
            return handle_admin_login(event, request_ctx, "jira")
        elif path == "/v1/admin/auth/jira/callback" and method == "GET":
            return handle_admin_callback(event, request_ctx, "jira")
        elif path == "/v1/admin/auth/slack/login" and method == "GET":
            return handle_admin_login(event, request_ctx, "slack")
        elif path == "/v1/admin/auth/slack/callback" and method == "GET":
            return handle_admin_callback(event, request_ctx, "slack")
        elif path == "/v1/admin/users" and method == "POST":
            return handle_admin_create_user(event, request_ctx)

        return build_error_response(404, "NOT_FOUND", "Endpoint not found")
    except Exception as e:
        logger.error("internal_error", error=str(e), exc_info=True)
        return build_error_response(500, "INTERNAL_ERROR", "An unexpected error occurred")


def _client(request_ctx) -> BusinessDataClient:
    return BusinessDataClient(tenant_id=request_ctx.tenant_id)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _record_activity(request_ctx, action: str, target: str, ai_source_used: str | None = None) -> None:
    """Central audit log helper — call from every handler with a side-effect."""
    try:
        _client(request_ctx).put_activity_log({
            "log_id": str(uuid.uuid4()),
            "actor_id": request_ctx.user_id,
            "action": action,
            "target": target,
            "created_at": _now(),
            "ai_source_used": ai_source_used,
        })
    except Exception as e:
        logger.error("activity_log_failed", error=str(e), action=action)


def handle_me(event, request_ctx):
    role = request_ctx.user_role.value if hasattr(request_ctx.user_role, "value") else str(request_ctx.user_role)
    return build_response(200, {
        "user_id": request_ctx.user_id,
        "display_name": request_ctx.user_id,
        "email": "",
        "roles": [role],
        "capabilities": [],
    })


def handle_list_projects(event, request_ctx):
    items = _client(request_ctx).list_projects()
    return build_response(200, [_project_view(p) for p in items])


def handle_get_project(event, request_ctx, project_id):
    item = _client(request_ctx).get_project(project_id)
    if not item:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy dự án")
    return build_response(200, _project_view(item))


def handle_list_tasks(event, request_ctx, project_id):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_tasks(project_id, status_filter=qs.get("status"))
    if qs.get("overdue_only") == "true":
        items = _client(request_ctx).list_overdue_tasks(project_id)
    return build_response(200, [_task_view(t) for t in items])


def handle_list_all_tasks(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    client = _client(request_ctx)
    items = client.list_tasks(qs["project_id"]) if qs.get("project_id") else client.list_all_tasks()
    if qs.get("status"):
        items = [t for t in items if t.get("status") == qs["status"]]
    return build_response(200, [_task_view(t) for t in items])


def handle_list_my_tasks(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_tasks_by_assignee(request_ctx.user_id)
    if qs.get("status"):
        items = [t for t in items if t.get("status") == qs["status"]]
    return build_response(200, [_task_view(t) for t in items])


def handle_update_task(event, request_ctx, project_id, task_id):
    body = parse_body(event)
    allowed = {"status", "due_date", "assignee", "blocked_reason"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return build_error_response(400, "BAD_REQUEST", "Không có trường hợp lệ để cập nhật")
    updates["updated_at"] = _now()
    client = _client(request_ctx)
    if not client.get_task(project_id, task_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy nhiệm vụ")
    client.update_task(project_id, task_id, updates)
    _record_activity(request_ctx, "edited", f"Nhiệm vụ {task_id}")
    return build_response(200, _task_view(client.get_task(project_id, task_id)))


def handle_add_task_comment(event, request_ctx, project_id, task_id):
    body = parse_body(event)
    content = (body.get("content") or "").strip()
    if not content:
        return build_error_response(400, "BAD_REQUEST", "Thiếu nội dung bình luận")
    client = _client(request_ctx)
    task = client.get_task(project_id, task_id)
    if not task:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy nhiệm vụ")
    comment = {
        "comment_id": str(uuid.uuid4()),
        "author_id": request_ctx.user_id,
        "author_display_name": body.get("author_display_name") or request_ctx.user_id,
        "content": content,
        "created_at": _now(),
    }
    client.add_task_comment(project_id, task_id, comment)
    return build_response(200, _task_view(client.get_task(project_id, task_id)))


def handle_list_risks(event, request_ctx, project_id):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_risks(project_id, severity_filter=qs.get("severity"))
    return build_response(200, [_risk_view(r) for r in items])


def handle_list_milestones(event, request_ctx, project_id):
    items = _client(request_ctx).list_milestones(project_id)
    return build_response(200, [_milestone_view(m) for m in items])


def handle_create_task_proposal(event, request_ctx, project_id):
    body = parse_body(event)
    task_id = body.get("task_id") or str(uuid.uuid4())
    token = f"tok-{uuid.uuid4().hex[:12]}"
    preview = {
        "task_id": task_id,
        "project_id": project_id,
        "title": body.get("title"),
        "description": body.get("description"),
        "assignee_user_id": body.get("assignee_user_id"),
        "priority": body.get("priority", "medium"),
        "due_date": body.get("due_date"),
        "milestone_id": body.get("milestone_id"),
        "status": "todo",
    }
    workflow_id = str(uuid.uuid4())
    WorkflowStateClient().create(workflow_id, {
        "kind": "task_proposal",
        "status": "waiting_for_user",
        "tenant_id": request_ctx.tenant_id,
        "user_id": request_ctx.user_id,
        "project_id": project_id,
        "preview": preview,
        "confirmation_token": token,
        "answer": "",
        "created_at": _now(),
    })
    return build_response(202, {"workflow_id": workflow_id, "status": "waiting_for_user", "preview": preview, "confirmation_token": token})


# ---------- Issues ----------
def handle_list_issues(event, request_ctx, project_id):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_issues(project_id, status_filter=qs.get("status"))
    return build_response(200, [_issue_view(i) for i in items])


def handle_list_all_issues(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_all_issues()
    if qs.get("status") and qs["status"] != "all":
        items = [i for i in items if i.get("status") == qs["status"]]
    if qs.get("impact") and qs["impact"] != "all":
        items = [i for i in items if i.get("impact") == qs["impact"]]
    if qs.get("source") and qs["source"] != "all":
        items = [i for i in items if i.get("source") == qs["source"]]
    if qs.get("project_id"):
        items = [i for i in items if i.get("project_id") == qs["project_id"]]
    return build_response(200, [_issue_view(i) for i in items])


def handle_update_issue(event, request_ctx, issue_id):
    qs = event.get("queryStringParameters") or {}
    project_id = qs.get("project_id")
    if not project_id:
        return build_error_response(400, "BAD_REQUEST", "Thiếu project_id")
    body = parse_body(event)
    allowed = {"status", "owner_id", "owner_name", "source", "resolution_plan"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return build_error_response(400, "BAD_REQUEST", "Không có trường hợp lệ để cập nhật")
    client = _client(request_ctx)
    if not client.get_issue(project_id, issue_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy khó khăn")
    client.update_issue(project_id, issue_id, updates)
    action = "approved" if updates.get("source") == "manual" else "edited"
    _record_activity(request_ctx, action, f"Khó khăn {issue_id}")
    return build_response(200, _issue_view(client.get_issue(project_id, issue_id)))


def handle_dismiss_issue(event, request_ctx, issue_id):
    qs = event.get("queryStringParameters") or {}
    project_id = qs.get("project_id")
    if not project_id:
        return build_error_response(400, "BAD_REQUEST", "Thiếu project_id")
    client = _client(request_ctx)
    if not client.get_issue(project_id, issue_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy khó khăn")
    client.update_issue(project_id, issue_id, {"status": "closed", "dismissed": True})
    _record_activity(request_ctx, "rejected", f"Đề xuất khó khăn {issue_id} (AI)")
    return build_response(200, {"status": "dismissed"})


# ---------- Decisions ----------
def handle_list_decisions(event, request_ctx, project_id):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_decisions(project_id, approval_status_filter=qs.get("approval_status"))
    return build_response(200, [_decision_view(d) for d in items])


def handle_list_all_decisions(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_all_decisions()
    if qs.get("approval_status") and qs["approval_status"] != "all":
        items = [d for d in items if d.get("approval_status") == qs["approval_status"]]
    if qs.get("project_id"):
        items = [d for d in items if d.get("project_id") == qs["project_id"]]
    if qs.get("only_confirmed") == "true":
        items = [d for d in items if d.get("approval_status") == "confirmed"]
    return build_response(200, [_decision_view(d) for d in items])


def handle_update_decision(event, request_ctx, decision_id):
    qs = event.get("queryStringParameters") or {}
    project_id = qs.get("project_id")
    if not project_id:
        return build_error_response(400, "BAD_REQUEST", "Thiếu project_id")
    body = parse_body(event)
    client = _client(request_ctx)
    decision = client.get_decision(project_id, decision_id)
    if not decision:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy quyết định")
    new_status = body.get("approval_status")
    if new_status not in ("confirmed", "rejected"):
        return build_error_response(400, "BAD_REQUEST", "approval_status phải là confirmed hoặc rejected")
    updates = {"approval_status": new_status}
    if new_status == "confirmed":
        updates["approver_name"] = body.get("approver_name", request_ctx.user_id)
        updates["decided_at"] = _now()
    client.update_decision(project_id, decision_id, updates)
    _record_activity(request_ctx, "approved" if new_status == "confirmed" else "rejected", f"Quyết định {decision_id}")
    return build_response(200, _decision_view(client.get_decision(project_id, decision_id)))


# ---------- Notifications ----------
def handle_list_notifications(event, request_ctx):
    items = _client(request_ctx).list_notifications(request_ctx.user_id)
    return build_response(200, [_notification_view(n) for n in items])


def handle_mark_notification_read(event, request_ctx, notification_id):
    client = _client(request_ctx)
    items = client.list_notifications(request_ctx.user_id)
    match = next((n for n in items if n.get("notification_id") == notification_id), None)
    if not match:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy thông báo")
    created_at = match["SK"].split("#")[1]
    client.mark_notification_read(request_ctx.user_id, created_at, notification_id)
    return build_response(200, {"status": "ok"})


def handle_mark_all_notifications_read(event, request_ctx):
    _client(request_ctx).mark_all_notifications_read(request_ctx.user_id)
    return build_response(200, {"status": "ok"})


# ---------- Activity log ----------
def handle_list_activity_log(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_activity_log(action_filter=qs.get("action"))
    return build_response(200, [_activity_log_view(a) for a in items])


# ---------- View mappers: DynamoDB item -> frontend shape ----------
def _project_view(p: dict) -> dict:
    return {
        "project_id": p.get("project_id"),
        "name": p.get("name"),
        "program_name": p.get("program_name", ""),
        "description": p.get("description", ""),
        "status": p.get("status", "active"),
        "health": p.get("health", "unknown"),
        "manager": p.get("manager", {"user_id": p.get("owner", ""), "display_name": p.get("owner", "")}),
        "next_milestone": p.get("next_milestone"),
        "overdue_task_count": p.get("overdue_task_count", 0),
        "high_risk_count": p.get("high_risk_count", 0),
        "progress": p.get("progress", 0),
        "team_name": p.get("team_name", ""),
        "start_date": p.get("start_date", ""),
        "end_date": p.get("end_date", ""),
        "tags": p.get("tags", []),
        "updated_at": p.get("updated_at", p.get("created_at", "")),
    }


def _task_view(t: dict) -> dict:
    return {
        "task_id": t.get("task_id"),
        "project_id": t.get("project_id"),
        "title": t.get("title"),
        "description": t.get("description", ""),
        "status": t.get("status", "todo"),
        "priority": t.get("priority", "medium"),
        "assignee": t.get("assignee", {"user_id": t.get("assignee_user_id", ""), "display_name": t.get("assignee_user_id", "")}),
        "due_date": t.get("due_date", ""),
        "is_overdue": t.get("is_overdue", False),
        "milestone": t.get("milestone"),
        "related_risks": t.get("related_risks", []),
        "depends_on_task_ids": t.get("depends_on_task_ids", []),
        "comments": t.get("comments", []),
        "version": t.get("version", 1),
        "updated_at": t.get("updated_at", t.get("created_at", "")),
        "allowed_actions": t.get("allowed_actions", []),
    }


def _risk_view(r: dict) -> dict:
    return {
        "risk_id": r.get("risk_id"),
        "project_id": r.get("project_id"),
        "title": r.get("title"),
        "description": r.get("description", ""),
        "status": r.get("status", "open"),
        "category": r.get("category", ""),
        "likelihood": r.get("likelihood", 1),
        "impact": r.get("impact", 1),
        "score": r.get("score", 1),
        "severity": r.get("severity", "low"),
        "owner": r.get("owner", {"user_id": r.get("owner_user_id", ""), "display_name": r.get("owner_user_id", "")}),
        "mitigation": r.get("mitigation", ""),
        "review_date": r.get("review_date", ""),
    }


def _milestone_view(m: dict) -> dict:
    return {
        "milestone_id": m.get("milestone_id"),
        "name": m.get("name"),
        "description": m.get("description", ""),
        "status": m.get("status", "not_started"),
        "health": m.get("health", "unknown"),
        "target_date": m.get("target_date", ""),
        "completed_at": m.get("completed_at"),
        "owner": m.get("owner", {"user_id": m.get("owner_user_id", ""), "display_name": m.get("owner_user_id", "")}),
    }


def _issue_view(i: dict) -> dict:
    return {
        "issue_id": i.get("issue_id"),
        "project_id": i.get("project_id"),
        "title": i.get("title"),
        "description": i.get("description", ""),
        "reporter_name": i.get("reporter_name", ""),
        "owner_id": i.get("owner_id"),
        "owner_name": i.get("owner_name"),
        "detected_at": i.get("detected_at", i.get("created_at", "")),
        "due_date": i.get("due_date"),
        "impact": i.get("impact", "medium"),
        "status": i.get("status", "new"),
        "source": i.get("source", "manual"),
        "ai_evidence": i.get("ai_evidence"),
        "resolution_plan": i.get("resolution_plan", ""),
    }


def _decision_view(d: dict) -> dict:
    return {
        "decision_id": d.get("decision_id"),
        "project_id": d.get("project_id"),
        "title": d.get("title"),
        "content": d.get("content", ""),
        "decided_at": d.get("decided_at", ""),
        "owner_name": d.get("owner_name", ""),
        "approver_name": d.get("approver_name"),
        "participants": d.get("participants", []),
        "reason": d.get("reason", ""),
        "alternatives_considered": d.get("alternatives_considered", []),
        "expected_impact": d.get("expected_impact", ""),
        "follow_up_tasks": d.get("follow_up_tasks", []),
        "approval_status": d.get("approval_status", "draft"),
        "effective_status": d.get("effective_status", "active"),
        "superseded_by_title": d.get("superseded_by_title"),
    }


def _notification_view(n: dict) -> dict:
    return {
        "notification_id": n.get("notification_id"),
        "type": n.get("type"),
        "title": n.get("title"),
        "message": n.get("message", ""),
        "is_read": n.get("is_read", False),
        "created_at": n.get("created_at", ""),
        "link": n.get("link", ""),
    }


def _activity_log_view(a: dict) -> dict:
    return {
        "log_id": a.get("log_id"),
        "actor_id": a.get("actor_id"),
        "action": a.get("action"),
        "target": a.get("target"),
        "created_at": a.get("created_at", ""),
        "ai_source_used": a.get("ai_source_used"),
    }


# ---------- Teams ----------
def handle_list_teams(event, request_ctx):
    items = _client(request_ctx).list_teams()
    return build_response(200, [_team_view(t) for t in items])


def handle_get_team(event, request_ctx, team_id):
    item = _client(request_ctx).get_team(team_id)
    if not item:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy nhóm")
    return build_response(200, _team_view(item))


def _team_view(t: dict) -> dict:
    return {
        "team_id": t.get("team_id"),
        "name": t.get("name"),
        "mission": t.get("mission", ""),
        "program_names": t.get("program_names", []),
        "members": t.get("members", []),
        "status": t.get("status", "active"),
        "last_report_at": t.get("last_report_at", ""),
    }


# ---------- User profiles (members / admin users) ----------
def handle_list_users(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_user_profiles()
    if qs.get("team"):
        items = [u for u in items if u.get("team_name") == qs["team"]]
    if qs.get("kind") and qs["kind"] != "all":
        items = [u for u in items if u.get("kind") == qs["kind"]]
    if qs.get("status") and qs["status"] != "all":
        items = [u for u in items if u.get("status") == qs["status"]]
    return build_response(200, [_user_profile_view(u) for u in items])


def handle_update_user(event, request_ctx, user_id):
    body = parse_body(event)
    allowed = {"status"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return build_error_response(400, "BAD_REQUEST", "Không có trường hợp lệ để cập nhật")
    client = _client(request_ctx)
    if not client.get_user_profile(user_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy người dùng")
    client.update_user_profile(user_id, updates)
    _record_activity(request_ctx, "permission_changed" if "status" in updates else "edited", f"Tài khoản {user_id}")
    return build_response(200, _user_profile_view(client.get_user_profile(user_id)))


def _user_profile_view(u: dict) -> dict:
    return {
        "user_id": u.get("user_id"),
        "name": u.get("name"),
        "email": u.get("email", ""),
        "role": u.get("role", "staff"),
        "role_label": u.get("role_label", ""),
        "team_name": u.get("team_name", ""),
        "program_names": u.get("program_names", []),
        "kind": u.get("kind", "staff"),
        "status": u.get("status", "active"),
        "start_date": u.get("start_date", ""),
        "end_date": u.get("end_date"),
    }


# ---------- Weekly updates (per user) ----------
def handle_get_my_current_update(event, request_ctx):
    updates = _client(request_ctx).list_weekly_updates(request_ctx.user_id)
    draft = next((u for u in updates if u.get("status") == "draft"), None)
    return build_response(200, _weekly_update_view(draft) if draft else None)


def handle_list_my_updates(event, request_ctx):
    updates = _client(request_ctx).list_weekly_updates(request_ctx.user_id)
    return build_response(200, [_weekly_update_view(u) for u in updates])


def handle_save_update_draft(event, request_ctx):
    body = parse_body(event)
    week = body.get("week")
    if not week:
        return build_error_response(400, "BAD_REQUEST", "Thiếu week")
    update = {
        "update_id": body.get("update_id") or str(uuid.uuid4()),
        "user_id": request_ctx.user_id,
        "user_name": body.get("user_name", request_ctx.user_id),
        "week": week,
        "program_ids": body.get("program_ids", []),
        "done_items": body.get("done_items", []),
        "in_progress_items": body.get("in_progress_items", []),
        "issues": body.get("issues", ""),
        "next_steps": body.get("next_steps", ""),
        "support_needed": body.get("support_needed", ""),
        "status": "draft",
        "submitted_at": None,
    }
    _client(request_ctx).put_weekly_update(request_ctx.user_id, update)
    return build_response(200, _weekly_update_view(update))


def handle_submit_update(event, request_ctx, week):
    client = _client(request_ctx)
    updates = client.list_weekly_updates(request_ctx.user_id)
    if not any(u.get("week") == week for u in updates):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy cập nhật")
    client.update_weekly_update(request_ctx.user_id, week, {"status": "submitted", "submitted_at": _now()})
    _record_activity(request_ctx, "edited", f"Gửi cập nhật tuần {week}")
    updated = next(u for u in client.list_weekly_updates(request_ctx.user_id) if u.get("week") == week)
    return build_response(200, _weekly_update_view(updated))


def _weekly_update_view(u: dict) -> dict:
    return {
        "update_id": u.get("update_id"),
        "user_id": u.get("user_id"),
        "user_name": u.get("user_name", ""),
        "week": u.get("week"),
        "program_ids": u.get("program_ids", []),
        "done_items": u.get("done_items", []),
        "in_progress_items": u.get("in_progress_items", []),
        "issues": u.get("issues", ""),
        "next_steps": u.get("next_steps", ""),
        "support_needed": u.get("support_needed", ""),
        "status": u.get("status", "draft"),
        "submitted_at": u.get("submitted_at"),
    }


# ---------- Team weekly reports ----------
def handle_list_team_reports(event, request_ctx, team_id):
    reports = _client(request_ctx).list_team_reports(team_id)
    return build_response(200, [_team_report_view(r) for r in reports])


def handle_list_all_team_reports(event, request_ctx):
    reports = _client(request_ctx).list_all_team_reports()
    return build_response(200, [_team_report_view(r) for r in reports])


def handle_remind_team_report(event, request_ctx, team_id, week):
    _record_activity(request_ctx, "edited", f"Gửi nhắc nhở báo cáo tuần {week} — nhóm {team_id}")
    return build_response(200, {"status": "ok"})


def handle_approve_team_report(event, request_ctx, team_id, week):
    client = _client(request_ctx)
    reports = client.list_team_reports(team_id)
    if not any(r.get("week") == week for r in reports):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo")
    client.update_team_report(team_id, week, {"status": "approved"})
    _record_activity(request_ctx, "approved", f"Báo cáo tuần {week} — nhóm {team_id}")
    updated = next(r for r in client.list_team_reports(team_id) if r.get("week") == week)
    return build_response(200, _team_report_view(updated))


def handle_publish_team_report(event, request_ctx, team_id, week):
    client = _client(request_ctx)
    reports = client.list_team_reports(team_id)
    if not any(r.get("week") == week for r in reports):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo")
    client.update_team_report(team_id, week, {"status": "published"})
    _record_activity(request_ctx, "approved", f"Công bố báo cáo tuần {week} — nhóm {team_id}")
    updated = next(r for r in client.list_team_reports(team_id) if r.get("week") == week)
    return build_response(200, _team_report_view(updated))


def _team_report_view(r: dict) -> dict:
    return {
        "report_id": r.get("report_id"),
        "team_id": r.get("team_id"),
        "team_name": r.get("team_name", ""),
        "week": r.get("week"),
        "member_submissions": r.get("member_submissions", []),
        "highlights": r.get("highlights", []),
        "issues": r.get("issues", []),
        "next_priorities": r.get("next_priorities", []),
        "status": r.get("status", "draft"),
    }


# ---------- Meetings ----------
def handle_list_meetings(event, request_ctx):
    items = _client(request_ctx).list_meetings()
    return build_response(200, [_meeting_view(m) for m in items])


def handle_get_meeting(event, request_ctx, meeting_id):
    item = _client(request_ctx).get_meeting(meeting_id)
    if not item:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy cuộc họp")
    return build_response(200, _meeting_view(item))


def handle_meeting_action_item(event, request_ctx, meeting_id, action_item_id, action):
    client = _client(request_ctx)
    meeting = client.get_meeting(meeting_id)
    if not meeting:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy cuộc họp")
    body = parse_body(event)
    new_status = "confirmed" if action == "confirm" else "rejected"
    action_items = meeting.get("action_items", [])
    found = False
    for item in action_items:
        if item.get("action_item_id") == action_item_id:
            item["status"] = new_status
            if action == "confirm" and body.get("owner"):
                item["owner"] = body.get("owner")
            found = True
    if not found:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy việc cần làm")
    client.update_meeting(meeting_id, {"action_items": action_items})
    _record_activity(request_ctx, "approved" if new_status == "confirmed" else "rejected", f"Việc cần làm sau họp {meeting_id}")
    return build_response(200, _meeting_view(client.get_meeting(meeting_id)))


def _meeting_view(m: dict) -> dict:
    return {
        "meeting_id": m.get("meeting_id"),
        "title": m.get("title"),
        "date": m.get("date", ""),
        "duration_minutes": m.get("duration_minutes", 0),
        "participants": m.get("participants", []),
        "team_id": m.get("team_id", ""),
        "program_name": m.get("program_name", ""),
        "summary": m.get("summary", ""),
        "key_topics": m.get("key_topics", []),
        "proposed_decisions": m.get("proposed_decisions", []),
        "action_items": m.get("action_items", []),
        "open_questions": m.get("open_questions", []),
    }


# ---------- Knowledge documents ----------
def handle_list_documents(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_knowledge_documents()
    if qs.get("status") and qs["status"] != "all":
        items = [d for d in items if d.get("status") == qs["status"]]
    if qs.get("kind") and qs["kind"] != "all":
        items = [d for d in items if d.get("kind") == qs["kind"]]
    if qs.get("team_name"):
        items = [d for d in items if d.get("team_name") == qs["team_name"]]
    return build_response(200, [_document_view(d) for d in items])


def handle_update_document(event, request_ctx, doc_id):
    body = parse_body(event)
    allowed = {"status", "owner"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return build_error_response(400, "BAD_REQUEST", "Không có trường hợp lệ để cập nhật")
    client = _client(request_ctx)
    if not client.get_knowledge_document(doc_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy tài liệu")
    client.update_knowledge_document(doc_id, updates)
    _record_activity(request_ctx, "edited", f"Tài liệu {doc_id}")
    return build_response(200, _document_view(client.get_knowledge_document(doc_id)))


def _document_view(d: dict) -> dict:
    return {
        "document_id": d.get("document_id"),
        "title": d.get("title"),
        "team_name": d.get("team_name", ""),
        "program_name": d.get("program_name"),
        "kind": d.get("kind", "report"),
        "owner": d.get("owner", ""),
        "updated_at": d.get("updated_at", ""),
        "source": d.get("source", "Docs"),
        "version": d.get("version", "v1"),
        "status": d.get("status", "active"),
        "ai_flag": d.get("ai_flag"),
    }


# ---------- Handoff / offboarding ----------
def handle_list_handoffs(event, request_ctx):
    items = _client(request_ctx).list_handoffs()
    return build_response(200, [_handoff_view(h) for h in items])


def handle_update_handoff(event, request_ctx, handoff_id):
    body = parse_body(event)
    status = body.get("status")
    if not status:
        return build_error_response(400, "BAD_REQUEST", "Thiếu status")
    client = _client(request_ctx)
    if not any(h.get("handoff_id") == handoff_id for h in client.list_handoffs()):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy bàn giao")
    client.update_handoff(handoff_id, {"status": status})
    _record_activity(request_ctx, "edited", f"Bàn giao {handoff_id}")
    updated = next(h for h in client.list_handoffs() if h.get("handoff_id") == handoff_id)
    return build_response(200, _handoff_view(updated))


def handle_list_offboarding(event, request_ctx):
    items = _client(request_ctx).list_offboarding_records()
    return build_response(200, [_offboarding_view(o) for o in items])


def handle_confirm_offboarding_handoff(event, request_ctx, offboarding_id):
    client = _client(request_ctx)
    if not any(o.get("offboarding_id") == offboarding_id for o in client.list_offboarding_records()):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy bản ghi")
    client.update_offboarding_record(offboarding_id, {"handoff_complete": True})
    _record_activity(request_ctx, "approved", f"Hoàn tất bàn giao — {offboarding_id}")
    updated = next(o for o in client.list_offboarding_records() if o.get("offboarding_id") == offboarding_id)
    return build_response(200, _offboarding_view(updated))


def _handoff_view(h: dict) -> dict:
    return {
        "handoff_id": h.get("handoff_id"),
        "from_name": h.get("from_name", ""),
        "to_name": h.get("to_name"),
        "team_name": h.get("team_name", ""),
        "program_name": h.get("program_name", ""),
        "current_responsibilities": h.get("current_responsibilities", ""),
        "in_progress_work": h.get("in_progress_work", ""),
        "pending_decisions": h.get("pending_decisions", ""),
        "unresolved_issues": h.get("unresolved_issues", ""),
        "key_contacts": h.get("key_contacts", ""),
        "related_docs": h.get("related_docs", ""),
        "risks": h.get("risks", ""),
        "next_steps": h.get("next_steps", ""),
        "status": h.get("status", "draft"),
    }


def _offboarding_view(o: dict) -> dict:
    return {
        "offboarding_id": o.get("offboarding_id"),
        "name": o.get("name", ""),
        "team_name": o.get("team_name", ""),
        "access_ends_at": o.get("access_ends_at", ""),
        "access_to_revoke": o.get("access_to_revoke", []),
        "owned_documents": o.get("owned_documents", []),
        "handoff_complete": o.get("handoff_complete", False),
    }


# ---------- Role permission matrix ----------
def handle_get_role_permissions(event, request_ctx):
    rows = _client(request_ctx).get_role_permissions()
    return build_response(200, rows)


def handle_toggle_role_permission(event, request_ctx):
    body = parse_body(event)
    role = body.get("role")
    action = body.get("action")
    if not role or not action:
        return build_error_response(400, "BAD_REQUEST", "Thiếu role hoặc action")
    client = _client(request_ctx)
    rows = client.get_role_permissions()
    row = next((r for r in rows if r.get("role") == role), None)
    if not row:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy vai trò")
    row["permissions"][action] = not row["permissions"].get(action, False)
    client.put_role_permissions(rows)
    _record_activity(request_ctx, "permission_changed", f"Quyền {action} của vai trò {role}")
    return build_response(200, row)


# ---------- Onboarding ----------
def handle_get_onboarding(event, request_ctx):
    client = _client(request_ctx)
    content = client.get_onboarding_content()
    checklist = client.get_onboarding_checklist(request_ctx.user_id)
    return build_response(200, _onboarding_view(content, checklist))


def handle_toggle_onboarding_checklist(event, request_ctx, item_id):
    client = _client(request_ctx)
    checklist = client.get_onboarding_checklist(request_ctx.user_id)
    found = False
    for item in checklist:
        if item.get("item_id") == item_id:
            item["done"] = not item.get("done", False)
            found = True
    if not found:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy mục checklist")
    client.put_onboarding_checklist(request_ctx.user_id, checklist)
    content = client.get_onboarding_content()
    return build_response(200, _onboarding_view(content, checklist))


def _onboarding_view(content: dict | None, checklist: list) -> dict:
    content = content or {}
    return {
        "team_name": content.get("team_name", ""),
        "team_intro": content.get("team_intro", ""),
        "program_intro": content.get("program_intro", ""),
        "contacts": content.get("contacts", []),
        "current_priorities": content.get("current_priorities", []),
        "key_decisions": content.get("key_decisions", []),
        "open_tasks": content.get("open_tasks", []),
        "required_docs": content.get("required_docs", []),
        "faqs": content.get("faqs", []),
        "glossary": content.get("glossary", []),
        "checklist": checklist,
    }


# ---------- Chat sessions + saved answers ----------
def handle_list_chat_sessions(event, request_ctx):
    items = _client(request_ctx).list_chat_sessions(request_ctx.user_id)
    return build_response(200, [_chat_session_view(s) for s in items])


def handle_rename_chat_session(event, request_ctx, session_id):
    body = parse_body(event)
    title = body.get("title")
    if not title:
        return build_error_response(400, "BAD_REQUEST", "Thiếu title")
    client = _client(request_ctx)
    if not client.get_chat_session(request_ctx.user_id, session_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy phiên trò chuyện")
    client.update_chat_session(request_ctx.user_id, session_id, {"title": title})
    return build_response(200, _chat_session_view(client.get_chat_session(request_ctx.user_id, session_id)))


def handle_list_saved_answers(event, request_ctx):
    items = _client(request_ctx).list_saved_answers(request_ctx.user_id)
    return build_response(200, [_saved_answer_view(s) for s in items])


def handle_save_answer(event, request_ctx):
    body = parse_body(event)
    question = body.get("question")
    answer = body.get("answer")
    if not question or not answer:
        return build_error_response(400, "BAD_REQUEST", "Thiếu question hoặc answer")
    entry = {
        "saved_id": str(uuid.uuid4()),
        "question": question,
        "answer": answer,
        "citations": body.get("citations", []),
        "saved_at": _now(),
        "saved_by": body.get("saved_by", request_ctx.user_id),
    }
    _client(request_ctx).put_saved_answer(request_ctx.user_id, entry)
    _record_activity(request_ctx, "shared", "Lưu câu trả lời từ trợ lý AI")
    return build_response(200, _saved_answer_view(entry))


def handle_delete_saved_answer(event, request_ctx, saved_id):
    _client(request_ctx).delete_saved_answer(request_ctx.user_id, saved_id)
    return build_response(200, {"status": "ok"})


def _chat_session_view(s: dict) -> dict:
    return {
        "session_id": s.get("session_id"),
        "title": s.get("title", ""),
        "last_message_at": s.get("last_message_at", ""),
        "message_count": s.get("message_count", 0),
    }


def _saved_answer_view(s: dict) -> dict:
    return {
        "saved_id": s.get("saved_id"),
        "question": s.get("question"),
        "answer": s.get("answer"),
        "citations": s.get("citations", []),
        "saved_at": s.get("saved_at", ""),
        "saved_by": s.get("saved_by", ""),
    }


def _upsert_chat_session(request_ctx, session_id: str, message: str) -> None:
    client = _client(request_ctx)
    existing = client.get_chat_session(request_ctx.user_id, session_id)
    if existing:
        client.update_chat_session(request_ctx.user_id, session_id, {
            "message_count": existing.get("message_count", 0) + 1,
            "last_message_at": _now(),
        })
    else:
        client.put_chat_session(request_ctx.user_id, {
            "session_id": session_id,
            "title": message[:60],
            "message_count": 1,
            "last_message_at": _now(),
        })


# ---------- Leadership summary (aggregate) ----------
def handle_leadership_summary(event, request_ctx):
    client = _client(request_ctx)
    projects = client.list_projects()
    issues = client.list_all_issues()
    decisions = client.list_all_decisions()
    team_reports = client.list_all_team_reports()
    today = datetime.now(timezone.utc).date().isoformat()

    teams_missing_report = [
        r.get("team_name", "") for r in team_reports
        if any(not s.get("submitted") for s in r.get("member_submissions", []))
    ]
    critical_issues = sum(1 for i in issues if i.get("impact") == "critical" and i.get("status") != "closed")
    overdue_issues = sum(
        1 for i in issues
        if i.get("due_date") and i["due_date"] < today and i.get("status") not in ("resolved", "closed")
    )
    pending_decisions = sum(1 for d in decisions if d.get("approval_status") in ("reviewing", "ai_suggested"))

    weekly_highlights: list[str] = []
    for r in team_reports:
        weekly_highlights.extend(r.get("highlights", []))

    attention_items = [f"{i.get('title')} ({i.get('project_id')})" for i in issues if i.get("impact") == "critical"]
    attention_items += [f'Chương trình "{p.get("name")}" đang quá hạn' for p in projects if p.get("health") == "red"]

    return build_response(200, {
        "total_programs": len(projects),
        "on_track": sum(1 for p in projects if p.get("health") == "green"),
        "at_risk": sum(1 for p in projects if p.get("health") == "amber"),
        "overdue": sum(1 for p in projects if p.get("health") == "red"),
        "critical_issues": critical_issues,
        "overdue_issues": overdue_issues,
        "pending_decisions": pending_decisions,
        "teams_missing_report": teams_missing_report,
        "weekly_highlights": weekly_highlights[:5],
        "attention_items": attention_items[:5],
    })


def handle_chat(event, request_ctx):
    """Synchronous chat: forward the user's message to the Orchestrator AgentCore
    runtime and return its result."""
    if not ORCHESTRATOR_RUNTIME_ARN:
        return build_error_response(503, "AGENT_UNAVAILABLE", "Chưa cấu hình orchestrator runtime")

    body = parse_body(event)
    message = (body.get("message") or "").strip()
    if not message:
        return build_error_response(400, "BAD_REQUEST", "Thiếu nội dung tin nhắn (message)")

    project_id = body.get("project_id")
    conversation_session_id = body.get("session_id") or str(uuid.uuid4())
    workflow_id = str(uuid.uuid4())
    role = request_ctx.user_role.value if hasattr(request_ctx.user_role, "value") else str(request_ctx.user_role)

    task_request = {
        "workflow_id": workflow_id,
        "task_id": str(uuid.uuid4()),
        "agent_name": "orchestrator",
        "intent": "workflow_orchestration",
        "instructions": message,
        "inputs": {"message": message},
        "constraints": {
            "tenant_id": request_ctx.tenant_id,
            "project_ids": [project_id] if project_id else [],
            "allowed_sources": ["s3"],
            "deadline_epoch_ms": 0,
            "user_id": request_ctx.user_id,
            "user_role": role,
            "session_id": conversation_session_id,
        },
    }

    # runtimeSessionId must be >= 33 chars.
    session_id = f"sess{workflow_id.replace('-', '')}"

    try:
        resp = _agentcore.invoke_agent_runtime(
            agentRuntimeArn=ORCHESTRATOR_RUNTIME_ARN,
            runtimeSessionId=session_id,
            payload=json.dumps(task_request).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        raw = resp["response"].read()
        result = json.loads(raw.decode("utf-8"))
        try:
            _upsert_chat_session(request_ctx, conversation_session_id, message)
        except Exception as e:
            logger.error("chat_session_upsert_failed", error=str(e))
        return build_response(200, _chat_response_view(workflow_id, result))
    except Exception as e:
        logger.error("orchestrator_invoke_failed", error=str(e), workflow_id=workflow_id)
        return build_error_response(502, "AGENT_ERROR", "Không kết nối được tới agent điều phối")


# ---------- View mapper: AgentTaskResult (from orchestrator runtime) -> frontend ChatResponse shape ----------
def _chat_response_view(workflow_id: str, result: dict) -> dict:
    proposed = result.get("proposed_actions") or []
    approval = None
    if proposed:
        pa = proposed[0]
        approval = {
            "approval_id": pa.get("action_id", ""),
            "action_type": pa.get("action_type", ""),
            "action_preview": pa.get("preview", {}),
            "status": "pending",
            "expires_at": "",
        }
    return {
        "workflow_id": workflow_id,
        "status": result.get("status", "completed"),
        "answer": result.get("summary", ""),
        "citations": [_citation_view(c) for c in result.get("citations", [])],
        "artifacts": [_artifact_view(a) for a in result.get("artifacts", [])],
        "approval": approval,
    }


def _citation_view(c: dict) -> dict:
    return {
        "citation_id": str(c.get("citation_id", "")),
        "source_system": c.get("source_system", ""),
        "document_id": c.get("document_id", ""),
        "document_title": c.get("document_title", ""),
        "source_uri": c.get("source_uri", ""),
        "page_or_section": c.get("page_or_section"),
        "excerpt": c.get("excerpt", ""),
        "last_modified_at": c.get("last_modified_at"),
    }


def _artifact_view(a: dict) -> dict:
    return {
        "artifact_id": a.get("artifact_id", ""),
        "artifact_type": a.get("artifact_type", ""),
        "title": a.get("title", ""),
        "s3_uri": a.get("s3_uri", ""),
        "created_at": a.get("created_at", ""),
    }


def _workflow_view(w: dict) -> dict:
    return {
        "workflow_id": w.get("workflow_id"),
        "status": w.get("status", "queued"),
        "answer": w.get("answer", ""),
        "citations": w.get("citations", []),
        "artifacts": w.get("artifacts", []),
        "approval": ({
            "approval_id": w.get("confirmation_token", ""),
            "action_type": w.get("kind", ""),
            "action_preview": w.get("preview", {}),
            "status": "pending",
            "expires_at": "",
        } if w.get("status") == "waiting_for_user" and w.get("preview") else None),
    }


def handle_create_workflow(event, request_ctx):
    body = parse_body(event)
    message = (body.get("message") or "").strip()
    if not message:
        return build_error_response(400, "BAD_REQUEST", "Thiếu nội dung tin nhắn (message)")
    workflow_id = str(uuid.uuid4())
    WorkflowStateClient().create(workflow_id, {
        "kind": "chat",
        "status": "queued",
        "tenant_id": request_ctx.tenant_id,
        "user_id": request_ctx.user_id,
        "project_id": body.get("project_id"),
        "message": message,
        "answer": "",
        "created_at": _now(),
    })
    return build_response(202, {"workflow_id": workflow_id, "status": "queued", "answer": "Workflow đã được tạo, kiểm tra trạng thái sau.", "citations": [], "artifacts": [], "approval": None})


def handle_get_workflow(event, request_ctx, workflow_id):
    workflow = WorkflowStateClient().get(workflow_id)
    if not workflow:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy workflow")
    return build_response(200, _workflow_view(workflow))


def handle_confirm_workflow(event, request_ctx, workflow_id):
    body = parse_body(event)
    token = body.get("confirmation_token")
    wf_client = WorkflowStateClient()
    workflow = wf_client.get(workflow_id)
    if not workflow:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy workflow")
    if workflow.get("status") != "waiting_for_user":
        return build_error_response(400, "VALIDATION_ERROR", "Workflow không ở trạng thái chờ xác nhận")
    if not token or token != workflow.get("confirmation_token"):
        return build_error_response(400, "VALIDATION_ERROR", "confirmation_token không hợp lệ hoặc đã hết hạn")

    answer = "Đã xác nhận."
    if workflow.get("kind") == "task_proposal":
        preview = workflow.get("preview", {})
        project_id = workflow.get("project_id")
        assignee_user_id = preview.get("assignee_user_id")
        task = {
            "task_id": preview["task_id"],
            "project_id": project_id,
            "title": preview.get("title"),
            "description": preview.get("description", ""),
            "status": preview.get("status", "todo"),
            "priority": preview.get("priority", "medium"),
            "assignee": {"user_id": assignee_user_id, "display_name": assignee_user_id} if assignee_user_id else None,
            "due_date": preview.get("due_date"),
            "milestone": preview.get("milestone_id"),
            "version": 1,
            "updated_at": _now(),
            "created_at": _now(),
        }
        _client(request_ctx).put_task(project_id, task)
        answer = f"Đã tạo nhiệm vụ \"{preview.get('title')}\" thành công."
        _record_activity(request_ctx, "approved", f"Đề xuất nhiệm vụ \"{preview.get('title')}\"")

    wf_client.update(workflow_id, {"status": "completed", "answer": answer})
    return build_response(200, {"workflow_id": workflow_id, "status": "completed", "answer": answer, "citations": [], "artifacts": [], "approval": None})


def handle_cancel_workflow(event, request_ctx, workflow_id):
    wf_client = WorkflowStateClient()
    workflow = wf_client.get(workflow_id)
    if workflow:
        wf_client.update(workflow_id, {"status": "cancelled"})
    return build_response(200, {"workflow_id": workflow_id, "status": "cancelled"})


def handle_get_report(event, request_ctx, report_id):
    report = _client(request_ctx).get_report_by_id(report_id)
    if not report:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo")
    return build_response(200, {
        "report_id": report.get("report_id"),
        "title": report.get("title", ""),
        "report_type": report.get("report_type", ""),
        "content": report.get("content", ""),
        "s3_uri": report.get("s3_uri", ""),
        "citations": report.get("citations", []),
        "created_at": report.get("created_at", ""),
    })


# ---------- Admin OAuth Flow ----------
def _get_secret(name: str) -> str:
    sm = boto3.client("secretsmanager", region_name=REGION)
    try:
        return sm.get_secret_value(SecretId=name).get("SecretString", "")
    except Exception as e:
        logger.error("get_secret_failed", name=name, error=str(e))
        return ""

def _update_secret(name: str, value: str):
    sm = boto3.client("secretsmanager", region_name=REGION)
    sm.put_secret_value(SecretId=name, SecretString=value)

def handle_admin_login(event, request_ctx, provider):
    import urllib.parse
    from agents.common.contracts.context import UserRole

    if request_ctx.user_role not in (UserRole.leader, UserRole.project_manager):
        return build_error_response(403, "FORBIDDEN", "Admin OAuth endpoints require leader/project_manager role")

    project_name = os.environ.get("PROJECT_NAME", "npo-ai")
    env = os.environ.get("ENVIRONMENT", "dev")
    client_id_secret = f"{project_name}-{env}-{provider}-client-id"
    client_id = _get_secret(client_id_secret)
    if not client_id:
        return build_error_response(500, "CONFIG_ERROR", f"Missing OAuth client id secret: {client_id_secret}")
    
    # URL callback to the same API
    headers = event.get("headers", {})
    host = headers.get("host", "localhost")
    protocol = headers.get("x-forwarded-proto", "https")
    redirect_uri = f"{protocol}://{host}/v1/admin/auth/{provider}/callback"
    
    if provider == "jira":
        params = {
            "audience": "api.atlassian.com",
            "client_id": client_id,
            "scope": "offline_access read:jira-work write:jira-work",
            "redirect_uri": redirect_uri,
            "state": "admin",
            "response_type": "code",
            "prompt": "consent",
        }
        url = "https://auth.atlassian.com/authorize?" + urllib.parse.urlencode(params)
    else:  # slack
        params = {
            "client_id": client_id,
            "scope": "chat:write,channels:read,groups:read",
            "redirect_uri": redirect_uri,
            "state": "admin",
        }
        url = "https://slack.com/oauth/v2/authorize?" + urllib.parse.urlencode(params)

    return build_response(302, "", headers={"Location": url})

def handle_admin_callback(event, request_ctx, provider):
    import urllib.request
    import urllib.parse
    from agents.common.contracts.context import UserRole

    if request_ctx.user_role not in (UserRole.leader, UserRole.project_manager):
        return build_error_response(403, "FORBIDDEN", "Admin OAuth endpoints require leader/project_manager role")

    qs = event.get("queryStringParameters") or {}
    code = qs.get("code")
    if not code:
        return build_error_response(400, "BAD_REQUEST", "Missing authorization code")
        
    project_name = os.environ.get("PROJECT_NAME", "npo-ai")
    env = os.environ.get("ENVIRONMENT", "dev")
    client_id_secret = f"{project_name}-{env}-{provider}-client-id"
    client_secret_secret = f"{project_name}-{env}-{provider}-client-secret"
    client_id = _get_secret(client_id_secret)
    client_secret = _get_secret(client_secret_secret)
    if not client_id or not client_secret:
        return build_error_response(500, "CONFIG_ERROR", f"Missing OAuth client config secrets: {client_id_secret}, {client_secret_secret}")
    headers = event.get("headers", {})
    host = headers.get("host", "localhost")
    protocol = headers.get("x-forwarded-proto", "https")
    redirect_uri = f"{protocol}://{host}/v1/admin/auth/{provider}/callback"
    
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri
    }
    encoded_data = urllib.parse.urlencode(data).encode("utf-8")
    
    token_url = "https://auth.atlassian.com/oauth/token" if provider == "jira" else "https://slack.com/api/oauth.v2.access"
    
    try:
        req = urllib.request.Request(token_url, data=encoded_data)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        with urllib.request.urlopen(req, timeout=10) as response:
            resp_body = json.loads(response.read().decode("utf-8"))

            # Extract access_token and refresh_token
            access_token = resp_body.get("access_token")
            refresh_token = resp_body.get("refresh_token")
            expires_in = resp_body.get("expires_in", 3600)

            if access_token:
                # Store both tokens as JSON for auto-refresh
                import time
                token_data = {
                    "access_token": access_token,
                    "refresh_token": refresh_token or "",
                    "expires_at": time.time() + expires_in,
                }
                _update_secret(f"{project_name}-{env}-{provider}-admin-access-token", json.dumps(token_data))
                return build_response(200, {
                    "status": "success",
                    "message": f"Successfully authenticated {provider} for admin!",
                    "expires_in": expires_in,
                    "has_refresh_token": bool(refresh_token),
                })
            else:
                return build_error_response(500, "TOKEN_ERROR", f"Failed to extract access token: {json.dumps(resp_body)}")
                
    except Exception as e:
        logger.error("oauth_exchange_failed", provider=provider, error=str(e))
        return build_error_response(500, "EXCHANGE_FAILED", str(e))

def handle_admin_create_user(event, request_ctx):
    role = request_ctx.user_role.value if hasattr(request_ctx.user_role, "value") else str(request_ctx.user_role)
    if role not in ["leader", "project_manager"]:
        return build_error_response(403, "FORBIDDEN", "Only admin or manager can create users")

    body = parse_body(event)
    username = body.get("username")
    email = body.get("email")
    password = body.get("password")

    if not username or not email or not password:
        return build_error_response(400, "BAD_REQUEST", "Thiếu username, email hoặc password")

    if not COGNITO_USER_POOL_ID:
        return build_error_response(500, "CONFIG_ERROR", "COGNITO_USER_POOL_ID is missing")

    try:
        _cognito.admin_create_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"}
            ],
            TemporaryPassword=password,
            MessageAction="SUPPRESS"
        )

        _cognito.admin_set_user_password(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
            Password=password,
            Permanent=True
        )

        return build_response(200, {"status": "success", "username": username, "email": email})
    except Exception as e:
        logger.error("admin_create_user_failed", error=str(e))
        return build_error_response(400, "CREATE_FAILED", str(e))
