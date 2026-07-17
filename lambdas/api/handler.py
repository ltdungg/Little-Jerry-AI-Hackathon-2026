import json
import structlog
from typing import Any
from agents.common.contracts.context import RequestContext, UserRole
from lambdas.common.utils import parse_body, build_response, build_error_response, extract_claims, build_request_context

logger = structlog.get_logger()

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
    # Implementation logic for synchronous chat
    return build_response(200, {"message": "Chat response"})

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
