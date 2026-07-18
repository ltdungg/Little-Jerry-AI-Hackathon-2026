import json
import os
import re
import uuid
import boto3
import structlog
from agents.common.clients.dynamodb_client import BusinessDataClient
from lambdas.common.utils import parse_body, build_response, build_error_response, extract_claims, build_request_context

logger = structlog.get_logger()

REGION = os.environ.get("REGION", "ap-southeast-2")
ORCHESTRATOR_RUNTIME_ARN = os.environ.get("ORCHESTRATOR_RUNTIME_ARN", "")
_agentcore = boto3.client("bedrock-agentcore", region_name=REGION)

PROJECT_TASKS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/?$")
PROJECT_RISKS_RE = re.compile(r"^/v1/projects/([^/]+)/risks/?$")
PROJECT_MILESTONES_RE = re.compile(r"^/v1/projects/([^/]+)/milestones/?$")
PROJECT_TASK_PROPOSALS_RE = re.compile(r"^/v1/projects/([^/]+)/tasks/proposals/?$")
PROJECT_DETAIL_RE = re.compile(r"^/v1/projects/([^/]+)/?$")


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
        elif path.startswith("/v1/reports/") and method == "GET":
            return handle_get_report(event, request_ctx)
        elif path == "/v1/projects" and method == "GET":
            return handle_list_projects(event, request_ctx)
        elif (m := PROJECT_TASK_PROPOSALS_RE.match(path)) and method == "POST":
            return handle_create_task_proposal(event, request_ctx, m.group(1))
        elif (m := PROJECT_TASKS_RE.match(path)) and method == "GET":
            return handle_list_tasks(event, request_ctx, m.group(1))
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

        return build_error_response(404, "NOT_FOUND", "Endpoint not found")
    except Exception as e:
        logger.error("internal_error", error=str(e), exc_info=True)
        return build_error_response(500, "INTERNAL_ERROR", "An unexpected error occurred")


def _client(request_ctx) -> BusinessDataClient:
    return BusinessDataClient(tenant_id=request_ctx.tenant_id)


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

def handle_get_report(event, request_ctx):
    return build_response(200, {"report_id": "rep-123", "data": "..."})

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
    project_name = os.environ.get("PROJECT_NAME", "npo-ai")
    env = os.environ.get("ENVIRONMENT", "dev")
    client_id = _get_secret(f"{project_name}-{env}-{provider}-client-id")
    
    # URL callback to the same API
    headers = event.get("headers", {})
    host = headers.get("host", "localhost")
    protocol = headers.get("x-forwarded-proto", "https")
    redirect_uri = f"{protocol}://{host}/v1/admin/auth/{provider}/callback"
    
    if provider == "jira":
        url = f"https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id={client_id}&scope=offline_access read:jira-work write:jira-work&redirect_uri={urllib.parse.quote(redirect_uri)}&state=admin&response_type=code&prompt=consent"
    else: # slack
        url = f"https://slack.com/oauth/v2/authorize?client_id={client_id}&scope=chat:write,channels:read,groups:read&redirect_uri={urllib.parse.quote(redirect_uri)}&state=admin"
        
    return build_response(302, "", headers={"Location": url})

def handle_admin_callback(event, request_ctx, provider):
    import urllib.request
    import urllib.parse
    
    qs = event.get("queryStringParameters") or {}
    code = qs.get("code")
    if not code:
        return build_error_response(400, "BAD_REQUEST", "Missing authorization code")
        
    project_name = os.environ.get("PROJECT_NAME", "npo-ai")
    env = os.environ.get("ENVIRONMENT", "dev")
    client_id = _get_secret(f"{project_name}-{env}-{provider}-client-id")
    client_secret = _get_secret(f"{project_name}-{env}-{provider}-client-secret")
    
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
        
        with urllib.request.urlopen(req) as response:
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

