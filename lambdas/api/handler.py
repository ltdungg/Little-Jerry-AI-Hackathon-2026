import json
import os
import uuid
import boto3
import structlog
from typing import Any
from agents.common.contracts.context import RequestContext, UserRole
from lambdas.common.utils import parse_body, build_response, build_error_response, extract_claims, build_request_context

logger = structlog.get_logger()

REGION = os.environ.get("REGION", "ap-southeast-2")
ORCHESTRATOR_RUNTIME_ARN = os.environ.get("ORCHESTRATOR_RUNTIME_ARN", "")
_agentcore = boto3.client("bedrock-agentcore", region_name=REGION)

def lambda_handler(event, context):
    path = event.get("requestContext", {}).get("http", {}).get("path", "")
    method = event.get("requestContext", {}).get("http", {}).get("method", "")

    claims = extract_claims(event)
    request_ctx = build_request_context(claims, event)

    logger.info("processing_request", path=path, method=method, user_id=request_ctx.user_id)

    try:
        if path == "/v1/chat" and method == "POST":
            return handle_chat(event, request_ctx)
        elif path == "/v1/workflows" and method == "POST":
            return handle_create_workflow(event, request_ctx)
        elif path.startswith("/v1/workflows/") and method == "GET":
            return handle_get_workflow(event, request_ctx)
        elif path.startswith("/v1/workflows/") and "/confirm" in path and method == "POST":
            return handle_confirm_workflow(event, request_ctx)
        elif path.startswith("/v1/workflows/") and "/cancel" in path and method == "POST":
            return handle_cancel_workflow(event, request_ctx)
        elif path.startswith("/v1/reports/") and method == "GET":
            return handle_get_report(event, request_ctx)
        elif path == "/health" and method == "GET":
            return build_response(200, {"status": "ok"})

        return build_error_response(404, "NOT_FOUND", "Endpoint not found")
    except Exception as e:
        logger.error("internal_error", error=str(e), exc_info=True)
        return build_error_response(500, "INTERNAL_ERROR", "An unexpected error occurred")

def handle_chat(event, request_ctx):
    """Synchronous chat: forward the user's message to the Orchestrator AgentCore
    runtime and return its result."""
    if not ORCHESTRATOR_RUNTIME_ARN:
        return build_error_response(503, "AGENT_UNAVAILABLE", "Orchestrator runtime not configured")

    body = parse_body(event)
    message = (body.get("message") or "").strip()
    if not message:
        return build_error_response(400, "BAD_REQUEST", "message is required")

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
        return build_response(200, {"workflow_id": workflow_id, "result": result})
    except Exception as e:
        logger.error("orchestrator_invoke_failed", error=str(e), workflow_id=workflow_id)
        return build_error_response(502, "AGENT_ERROR", "Failed to reach orchestrator agent")

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
