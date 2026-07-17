import json
import uuid
import structlog
from typing import Any

logger = structlog.get_logger()

def parse_body(event: dict) -> dict:
    body = event.get("body", "{}")
    if isinstance(body, str):
        return json.loads(body)
    return body

def build_response(status_code: int, body: dict, headers: dict | None = None) -> dict:
    default_headers = {"Content-Type": "application/json"}
    if headers:
        default_headers.update(headers)
    return {"statusCode": status_code, "headers": default_headers, "body": json.dumps(body, default=str)}

def build_error_response(status_code: int, error_code: str, message: str, details: dict | None = None) -> dict:
    body = {"error_code": error_code, "message": message}
    if details:
        body["details"] = details
    return build_response(status_code, body)

def extract_claims(event: dict) -> dict:
    return event.get("requestContext", {}).get("authorizer", {}).get("claims", {})

def build_request_context(claims: dict, event: dict):
    from agents.common.contracts.context import RequestContext, UserRole
    groups = claims.get("cognito:groups", "").split(",") if claims.get("cognito:groups") else []
    role = UserRole.npo_staff
    for g in groups:
        try:
            role = UserRole(g.strip())
            break
        except ValueError:
            continue
    return RequestContext(
        session_id=claims.get("session_id", str(uuid.uuid4())),
        tenant_id=claims.get("custom:tenant_id", "tenant-aiv"),
        user_id=claims.get("sub", "unknown"),
        user_role=role,
        source_ip=event.get("requestContext", {}).get("http", {}).get("sourceIp"),
    )
