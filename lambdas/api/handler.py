import json
import os
import re
import uuid
import boto3
import structlog
from datetime import datetime, timezone
from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.clients.s3_client import store_report_pdf, presign_s3_uri
from lambdas.common.utils import parse_body, build_response, build_error_response, extract_claims, build_request_context
from lambdas.common.pdf_renderer import render_report_pdf
from shared.report_generators import REPORT_GENERATORS, REPORT_TITLES

logger = structlog.get_logger()

REGION = os.environ.get("REGION", "ap-southeast-2")
ORCHESTRATOR_RUNTIME_ARN = os.environ.get("ORCHESTRATOR_RUNTIME_ARN", "")
ARTIFACT_BUCKET = os.environ.get("ARTIFACT_BUCKET", "")
_agentcore = boto3.client("bedrock-agentcore", region_name=REGION)
_cognito = boto3.client("cognito-idp", region_name=REGION)
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")

VALID_REPORT_TYPES = set(REPORT_GENERATORS.keys())
VALID_REPORT_CATEGORIES = frozenset({"daily", "weekly", "manual"})

PROJECT_TASKS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/?$")
PROJECT_TASK_PROPOSALS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/proposals/?$")
PROJECT_TASK_COMMENTS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/([^/]+)/comments/?$")
PROJECT_TASK_DETAIL_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/([^/]+)/?$")
PROJECT_RISKS_RE = re.compile(r"^/v1/projects/([^/]+)/risks/?$")
PROJECT_MILESTONES_RE = re.compile(r"^/v1/projects/([^/]+)/milestones/?$")
PROJECT_ISSUES_RE = re.compile(r"^/v1/projects/([^/]+)/issues/?$")
PROJECT_REPORTS_RE = re.compile(r"^/v1/projects/([^/]+)/reports/?$")
PROJECT_DAILY_UPDATES_RE = re.compile(r"^/v1/projects/([^/]+)/daily-updates/?$")
PROJECT_DETAIL_RE = re.compile(r"^/v1/projects/([^/]+)/?$")
ISSUE_DETAIL_RE = re.compile(r"^/v1/issues/([^/]+)/?$")
REPORT_DETAIL_RE = re.compile(r"^/v1/reports/([^/]+)/?$")
REPORT_EXPORT_PDF_RE = re.compile(r"^/v1/reports/([^/]+)/export-pdf/?$")
TEAM_DETAIL_RE = re.compile(r"^/v1/teams/([^/]+)/?$")
TEAM_REPORTS_RE = re.compile(r"^/v1/teams/([^/]+)/reports/?$")
TEAM_REPORT_REMIND_RE = re.compile(r"^/v1/teams/([^/]+)/reports/([^/]+)/remind/?$")
TEAM_REPORT_APPROVE_RE = re.compile(r"^/v1/teams/([^/]+)/reports/([^/]+)/approve/?$")
TEAM_REPORT_PUBLISH_RE = re.compile(r"^/v1/teams/([^/]+)/reports/([^/]+)/publish/?$")
MEETING_DETAIL_RE = re.compile(r"^/v1/meetings/([^/]+)/?$")
MEETING_ACTION_ITEM_RE = re.compile(r"^/v1/meetings/([^/]+)/action-items/([^/]+)/(confirm|reject)/?$")
HANDOFF_DETAIL_RE = re.compile(r"^/v1/handoffs/([^/]+)/?$")


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
        elif path.startswith("/v1/workflows/") and "/confirm" in path and method == "POST":
            return handle_confirm_workflow(event, request_ctx)
        elif path.startswith("/v1/workflows/") and "/cancel" in path and method == "POST":
            return handle_cancel_workflow(event, request_ctx)
        elif path.startswith("/v1/workflows/") and method == "GET":
            return handle_get_workflow(event, request_ctx)

        # ---------- Reports ----------
        elif (m := REPORT_EXPORT_PDF_RE.match(path)) and method == "POST":
            return handle_export_report_pdf(event, request_ctx, m.group(1))
        elif (m := REPORT_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_report(event, request_ctx, m.group(1))
        elif (m := REPORT_DETAIL_RE.match(path)) and method in ("PUT", "PATCH"):
            return handle_update_report(event, request_ctx, m.group(1))
        elif path == "/v1/reports" and method == "GET":
            return handle_list_all_reports(event, request_ctx)
        elif (m := PROJECT_REPORTS_RE.match(path)) and method == "GET":
            return handle_list_project_reports(event, request_ctx, m.group(1))
        elif (m := PROJECT_REPORTS_RE.match(path)) and method == "POST":
            return handle_create_report(event, request_ctx, m.group(1))

        # ---------- Team reports (Bảng thông tin nhóm) ----------
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
        elif path == "/v1/teams" and method == "GET":
            return handle_list_teams(event, request_ctx)

        # ---------- Issues (Khó khăn) ----------
        elif (m := ISSUE_DETAIL_RE.match(path)) and method in ("PUT", "PATCH"):
            return handle_update_issue(event, request_ctx, m.group(1))
        elif (m := ISSUE_DETAIL_RE.match(path)) and method == "DELETE":
            return handle_dismiss_issue(event, request_ctx, m.group(1))
        elif (m := PROJECT_ISSUES_RE.match(path)) and method == "GET":
            return handle_list_issues(event, request_ctx, m.group(1))
        elif path == "/v1/issues" and method == "GET":
            return handle_list_all_issues(event, request_ctx)

        # ---------- Meetings ----------
        elif (m := MEETING_ACTION_ITEM_RE.match(path)) and method == "POST":
            return handle_meeting_action_item(event, request_ctx, m.group(1), m.group(2), m.group(3))
        elif (m := MEETING_DETAIL_RE.match(path)) and method == "GET":
            return handle_get_meeting(event, request_ctx, m.group(1))
        elif path == "/v1/meetings" and method == "GET":
            return handle_list_meetings(event, request_ctx)

        # ---------- Handoffs ----------
        elif (m := HANDOFF_DETAIL_RE.match(path)) and method in ("PUT", "PATCH"):
            return handle_update_handoff(event, request_ctx, m.group(1))
        elif path == "/v1/handoffs" and method == "GET":
            return handle_list_handoffs(event, request_ctx)

        # ---------- Daily updates (cập nhật tiến độ task hằng ngày) ----------
        elif (m := PROJECT_DAILY_UPDATES_RE.match(path)) and method == "POST":
            return handle_submit_daily_update(event, request_ctx, m.group(1))
        elif (m := PROJECT_DAILY_UPDATES_RE.match(path)) and method == "GET":
            return handle_list_daily_updates(event, request_ctx, m.group(1))

        elif path == "/v1/projects" and method == "GET":
            return handle_list_projects(event, request_ctx)
        elif (m := PROJECT_TASK_PROPOSALS_RE.match(path)) and method == "POST":
            return handle_create_task_proposal(event, request_ctx, m.group(1))
        elif (m := PROJECT_TASK_COMMENTS_RE.match(path)) and method == "POST":
            return handle_add_task_comment(event, request_ctx, m.group(1), m.group(2))
        elif (m := PROJECT_TASKS_RE.match(path)) and method == "GET":
            return handle_list_tasks(event, request_ctx, m.group(1))
        elif (m := PROJECT_TASK_DETAIL_RE.match(path)) and method in ("PUT", "PATCH"):
            return handle_update_task(event, request_ctx, m.group(1), m.group(2))
        elif (m := PROJECT_RISKS_RE.match(path)) and method == "GET":
            return handle_list_risks(event, request_ctx, m.group(1))
        elif (m := PROJECT_MILESTONES_RE.match(path)) and method == "GET":
            return handle_list_milestones(event, request_ctx, m.group(1))
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
            "ai_source_used": ai_source_used,
            "created_at": _now(),
        })
    except Exception as e:
        logger.error("activity_log_failed", error=str(e))


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


def handle_update_task(event, request_ctx, project_id, task_id):
    body = parse_body(event)
    updates = {k: v for k, v in body.items() if k in ("status", "priority", "assignee_user_id", "due_date", "milestone_id")}
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
    if not client.get_task(project_id, task_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy nhiệm vụ")
    comment = {
        "comment_id": str(uuid.uuid4()),
        "author_user_id": request_ctx.user_id,
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
        "title": body.get("title"),
        "description": body.get("description"),
        "assignee_user_id": body.get("assignee_user_id"),
        "priority": body.get("priority", "medium"),
        "due_date": body.get("due_date"),
        "milestone_id": body.get("milestone_id"),
        "status": "todo",
    }
    workflow_id = str(uuid.uuid4())
    return build_response(202, {"workflow_id": workflow_id, "status": "waiting_for_user", "preview": preview, "confirmation_token": token})


# ---------- Reports (docs/REPORT-EXPORT-SPEC.md) ----------
def _report_view(r: dict) -> dict:
    return {
        "report_id": r.get("report_id"),
        "project_id": r.get("project_id"),
        "category": r.get("category", "manual"),
        "report_type": r.get("report_type", ""),
        "title": r.get("title", ""),
        "period_start": r.get("period_start", ""),
        "period_end": r.get("period_end", ""),
        "status": r.get("status", "draft"),
        "content": r.get("content", ""),
        "pdf_s3_uri": r.get("pdf_s3_uri"),
        "generated_at": r.get("generated_at", ""),
        "edited_at": r.get("edited_at"),
        "exported_at": r.get("exported_at"),
        "version": r.get("version", 1),
    }


def handle_list_project_reports(event, request_ctx, project_id):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_reports(project_id, category_filter=qs.get("category"))
    return build_response(200, [_report_view(r) for r in items])


def handle_list_all_reports(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_all_reports(category_filter=qs.get("category"))
    if qs.get("project_id"):
        items = [r for r in items if r.get("project_id") == qs["project_id"]]
    return build_response(200, [_report_view(r) for r in items])


def _create_report_now(request_ctx, project_id: str, report_type: str, category: str) -> dict:
    client = _client(request_ctx)
    generator = REPORT_GENERATORS[report_type]
    content = generator(project_id, client)
    now = _now()
    today = now[:10]
    report = {
        "report_id": str(uuid.uuid4()),
        "project_id": project_id,
        "category": category,
        "report_type": report_type,
        "title": f"{REPORT_TITLES.get(report_type, 'Báo cáo')} — {today}",
        "period_start": today,
        "period_end": today,
        "status": "draft",
        "content": content,
        "pdf_s3_uri": None,
        "generated_at": now,
        "edited_at": None,
        "exported_at": None,
        "version": 1,
        "created_at": now,
        "created_by": request_ctx.user_id,
    }
    client.put_report(project_id, report)
    return report


def handle_create_report(event, request_ctx, project_id):
    body = parse_body(event)
    report_type = body.get("report_type", "weekly_status")
    if report_type not in VALID_REPORT_TYPES:
        return build_error_response(400, "BAD_REQUEST", f"report_type phải là một trong: {', '.join(sorted(VALID_REPORT_TYPES))}")
    if not _client(request_ctx).get_project(project_id):
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy dự án")

    report = _create_report_now(request_ctx, project_id, report_type, category="manual")
    _record_activity(request_ctx, "edited", f"Tạo báo cáo thủ công \"{report['title']}\"")
    return build_response(201, _report_view(report))


def handle_get_report(event, request_ctx, report_id):
    report = _client(request_ctx).get_report_by_id(report_id)
    if not report:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo")
    return build_response(200, _report_view(report))


def handle_update_report(event, request_ctx, report_id):
    body = parse_body(event)
    content = body.get("content")
    if content is None:
        return build_error_response(400, "BAD_REQUEST", "Thiếu nội dung (content)")

    client = _client(request_ctx)
    report = client.get_report_by_id(report_id)
    if not report:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo")

    client.update_report(report["project_id"], report_id, {
        "content": content,
        "status": "edited",
        "edited_at": _now(),
        "version": report.get("version", 1) + 1,
    })
    _record_activity(request_ctx, "edited", f"Sửa báo cáo \"{report.get('title')}\"")
    return build_response(200, _report_view(client.get_report_by_id(report_id)))


def handle_export_report_pdf(event, request_ctx, report_id):
    if not ARTIFACT_BUCKET:
        return build_error_response(500, "CONFIG_ERROR", "ARTIFACT_BUCKET chưa được cấu hình")

    client = _client(request_ctx)
    report = client.get_report_by_id(report_id)
    if not report:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo")

    subtitle = f"{report.get('project_id', '')} · {report.get('period_start', '')} → {report.get('period_end', '')}"
    pdf_bytes = render_report_pdf(
        title=report.get("title", "Báo cáo"),
        subtitle=subtitle,
        content_markdown=report.get("content", ""),
        edited=report.get("status") in ("edited", "exported") and bool(report.get("edited_at")),
    )

    pdf_s3_uri = store_report_pdf(ARTIFACT_BUCKET, request_ctx.tenant_id, report["project_id"], report_id, pdf_bytes)

    now = _now()
    client.update_report(report["project_id"], report_id, {
        "pdf_s3_uri": pdf_s3_uri,
        "status": "exported",
        "exported_at": now,
    })
    _record_activity(request_ctx, "exported", f"Báo cáo \"{report.get('title')}\"")

    download_url = presign_s3_uri(pdf_s3_uri, expires_in=900)
    return build_response(200, {
        "report_id": report_id,
        "pdf_s3_uri": pdf_s3_uri,
        "download_url": download_url,
        "expires_in": 900,
    })


# ---------- Team reports (Bảng thông tin nhóm) ----------
def _team_view(t: dict) -> dict:
    return {
        "team_id": t.get("team_id"),
        "name": t.get("name", ""),
        "mission": t.get("mission", ""),
        "program_names": t.get("program_names", []),
        "members": t.get("members", []),
        "status": t.get("status", "active"),
        "last_report_at": t.get("last_report_at", ""),
    }


def _team_report_view(r: dict) -> dict:
    return {
        "id": r.get("report_id", r.get("week", "")),
        "team_id": r.get("team_id"),
        "team_name": r.get("team_name", ""),
        "week": r.get("week", ""),
        "member_submissions": r.get("member_submissions", []),
        "highlights": r.get("highlights", []),
        "issues": r.get("issues", []),
        "next_priorities": r.get("next_priorities", []),
        "status": r.get("status", "draft"),
    }


def handle_list_teams(event, request_ctx):
    return build_response(200, [_team_view(t) for t in _client(request_ctx).list_teams()])


def handle_get_team(event, request_ctx, team_id):
    team = _client(request_ctx).get_team(team_id)
    if not team:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy nhóm")
    return build_response(200, _team_view(team))


def handle_list_team_reports(event, request_ctx, team_id):
    items = _client(request_ctx).list_team_reports(team_id)
    return build_response(200, [_team_report_view(r) for r in items])


def handle_list_all_team_reports(event, request_ctx):
    items = _client(request_ctx).list_all_team_reports()
    return build_response(200, [_team_report_view(r) for r in items])


def handle_remind_team_report(event, request_ctx, team_id, week):
    client = _client(request_ctx)
    reports = client.list_team_reports(team_id)
    report = next((r for r in reports if r.get("week") == week), None)
    if not report:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy báo cáo nhóm")
    not_submitted = [m for m in report.get("member_submissions", []) if not m.get("submitted")]
    _record_activity(request_ctx, "edited", f"Nhắc nhở {len(not_submitted)} người chưa gửi báo cáo nhóm {team_id}")
    return build_response(200, {"team_id": team_id, "reminded_user_ids": [m.get("user_id") for m in not_submitted]})


def handle_approve_team_report(event, request_ctx, team_id, week):
    client = _client(request_ctx)
    client.update_team_report(team_id, week, {"status": "approved"})
    _record_activity(request_ctx, "approved", f"Báo cáo nhóm {team_id} tuần {week}")
    reports = client.list_team_reports(team_id)
    report = next((r for r in reports if r.get("week") == week), None)
    return build_response(200, _team_report_view(report) if report else {"status": "approved"})


def handle_publish_team_report(event, request_ctx, team_id, week):
    client = _client(request_ctx)
    client.update_team_report(team_id, week, {"status": "published"})
    _record_activity(request_ctx, "shared", f"Báo cáo nhóm {team_id} tuần {week}")
    reports = client.list_team_reports(team_id)
    report = next((r for r in reports if r.get("week") == week), None)
    return build_response(200, _team_report_view(report) if report else {"status": "published"})


# ---------- Issues (Khó khăn) ----------
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


def _find_issue_project(client: BusinessDataClient, issue_id: str) -> str | None:
    for i in client.list_all_issues():
        if i.get("issue_id") == issue_id:
            return i.get("project_id")
    return None


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
    return build_response(200, [_issue_view(i) for i in items])


def handle_update_issue(event, request_ctx, issue_id):
    body = parse_body(event)
    client = _client(request_ctx)
    project_id = _find_issue_project(client, issue_id)
    if not project_id:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy khó khăn")
    updates = {k: v for k, v in body.items() if k in ("status", "owner_id", "owner_name", "source", "resolution_plan", "due_date", "impact")}
    if not updates:
        return build_error_response(400, "BAD_REQUEST", "Không có trường hợp lệ để cập nhật")
    client.update_issue(project_id, issue_id, updates)
    _record_activity(request_ctx, "edited", f"Khó khăn {issue_id}")
    return build_response(200, _issue_view(client.get_issue(project_id, issue_id)))


def handle_dismiss_issue(event, request_ctx, issue_id):
    client = _client(request_ctx)
    project_id = _find_issue_project(client, issue_id)
    if not project_id:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy khó khăn")
    client.delete_issue(project_id, issue_id)
    _record_activity(request_ctx, "rejected", f"Khó khăn AI đề xuất {issue_id}")
    return build_response(200, {"status": "dismissed"})


# ---------- Meetings ----------
def _meeting_view(m: dict) -> dict:
    return {
        "meeting_id": m.get("meeting_id"),
        "title": m.get("title", ""),
        "date": m.get("date", ""),
        "duration_minutes": m.get("duration_minutes", 0),
        "participants": m.get("participants", []),
        "team_id": m.get("team_id"),
        "project_id": m.get("project_id"),
        "summary": m.get("summary", ""),
        "key_topics": m.get("key_topics", []),
        "proposed_decisions": m.get("proposed_decisions", []),
        "action_items": m.get("action_items", []),
        "open_questions": m.get("open_questions", []),
    }


def handle_list_meetings(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_meetings()
    if qs.get("project_id"):
        items = [m for m in items if m.get("project_id") == qs["project_id"]]
    return build_response(200, [_meeting_view(m) for m in items])


def handle_get_meeting(event, request_ctx, meeting_id):
    meeting = _client(request_ctx).get_meeting(meeting_id)
    if not meeting:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy cuộc họp")
    return build_response(200, _meeting_view(meeting))


def handle_meeting_action_item(event, request_ctx, meeting_id, action_item_id, action):
    body = parse_body(event)
    client = _client(request_ctx)
    meeting = client.get_meeting(meeting_id)
    if not meeting:
        return build_error_response(404, "NOT_FOUND", "Không tìm thấy cuộc họp")

    new_status = "confirmed" if action == "confirm" else "rejected"
    action_items = meeting.get("action_items", [])
    for a in action_items:
        if a.get("id") == action_item_id:
            a["status"] = new_status
            if action == "confirm":
                a["owner"] = body.get("owner") or a.get("owner")
    client.update_meeting(meeting_id, {"action_items": action_items})
    _record_activity(request_ctx, "edited" if action == "confirm" else "rejected", f"Việc cần làm sau họp {meeting_id}")
    return build_response(200, _meeting_view(client.get_meeting(meeting_id)))


# ---------- Handoffs (Bàn giao) ----------
def _handoff_view(h: dict) -> dict:
    return {
        "handoff_id": h.get("handoff_id"),
        "from_name": h.get("from_name", ""),
        "to_name": h.get("to_name"),
        "team_name": h.get("team_name", ""),
        "project_id": h.get("project_id"),
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


def handle_list_handoffs(event, request_ctx):
    qs = event.get("queryStringParameters") or {}
    items = _client(request_ctx).list_handoffs()
    if qs.get("project_id"):
        items = [h for h in items if h.get("project_id") == qs["project_id"]]
    return build_response(200, [_handoff_view(h) for h in items])


def handle_update_handoff(event, request_ctx, handoff_id):
    body = parse_body(event)
    status = body.get("status")
    if status not in ("draft", "team_lead_review", "receiver_confirm", "complete"):
        return build_error_response(400, "BAD_REQUEST", "status không hợp lệ")
    client = _client(request_ctx)
    client.update_handoff(handoff_id, {"status": status})
    _record_activity(request_ctx, "edited", f"Bàn giao {handoff_id}")
    items = [h for h in client.list_handoffs() if h.get("handoff_id") == handoff_id]
    return build_response(200, _handoff_view(items[0]) if items else {"status": status})


# ---------- Daily updates (cập nhật tiến độ task hằng ngày, theo dự án) ----------
def _daily_update_view(u: dict) -> dict:
    return {
        "id": f"{u.get('date', '')}#{u.get('user_id', '')}",
        "user_id": u.get("user_id"),
        "user_name": u.get("user_name", ""),
        "date": u.get("date", ""),
        "project_id": u.get("project_id"),
        "task_updates": u.get("task_updates", []),
        "status": u.get("status", "submitted"),
    }


def handle_list_daily_updates(event, request_ctx, project_id):
    qs = event.get("queryStringParameters") or {}
    date = qs.get("date") or datetime.now(timezone.utc).date().isoformat()
    items = _client(request_ctx).list_daily_updates(project_id, date=date)
    return build_response(200, [_daily_update_view(u) for u in items])


def handle_submit_daily_update(event, request_ctx, project_id):
    body = parse_body(event)
    task_updates = body.get("task_updates")
    if not task_updates:
        return build_error_response(400, "BAD_REQUEST", "Thiếu task_updates")
    date = body.get("date") or datetime.now(timezone.utc).date().isoformat()

    client = _client(request_ctx)
    update = {
        "user_id": request_ctx.user_id,
        "user_name": body.get("user_name", request_ctx.user_id),
        "date": date,
        "project_id": project_id,
        "task_updates": task_updates,
        "status": "submitted",
    }
    client.put_daily_update(project_id, update)

    for tu in task_updates:
        task_id = tu.get("task_id")
        status_after = tu.get("status_after")
        if task_id and status_after and client.get_task(project_id, task_id):
            client.update_task(project_id, task_id, {"status": status_after, "updated_at": _now()})

    _record_activity(request_ctx, "edited", f"Cập nhật hằng ngày {date} — dự án {project_id}")
    return build_response(201, _daily_update_view(update))


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

def handle_create_workflow(event, request_ctx):
    # Implementation logic for async workflow
    return build_response(202, {"workflow_id": "wf-123"})

def handle_get_workflow(event, request_ctx):
    return build_response(200, {"workflow_id": "wf-123", "status": "pending"})

def handle_confirm_workflow(event, request_ctx):
    return build_response(200, {"status": "confirmed"})

def handle_cancel_workflow(event, request_ctx):
    return build_response(200, {"status": "cancelled"})

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

            # Extract access_token (and bot token for Slack)
            access_token = resp_body.get("access_token")
            if provider == "slack" and not access_token:
                # Slack uses 'authed_user' access_token or just the bot 'access_token'
                pass

            if access_token:
                _update_secret(f"{project_name}-{env}-{provider}-admin-access-token", access_token)
                return build_response(200, {"status": "success", "message": f"Successfully authenticated {provider} for admin!"})
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
