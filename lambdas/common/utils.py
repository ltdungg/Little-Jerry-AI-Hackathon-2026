import json
import uuid
import structlog
from decimal import Decimal
from typing import Any

logger = structlog.get_logger()

def parse_body(event: dict) -> dict:
    body = event.get("body", "{}")
    if isinstance(body, str):
        return json.loads(body)
    return body

def _json_default(obj: Any) -> Any:
    # DynamoDB (boto3) returns Decimal for all numbers; without this, json.dumps
    # either raises or (with a naive `default=str`) turns e.g. 3 into "3".
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return str(obj)

def build_response(status_code: int, body: dict | list, headers: dict | None = None) -> dict:
    default_headers = {"Content-Type": "application/json"}
    if headers:
        default_headers.update(headers)
    return {"statusCode": status_code, "headers": default_headers, "body": json.dumps(body, default=_json_default)}

def build_error_response(status_code: int, error_code: str, message: str, details: dict | None = None) -> dict:
    body: dict[str, Any] = {"error_code": error_code, "message": message}
    if details:
        body["details"] = details
    return build_response(status_code, body)

def extract_claims(event: dict) -> dict:
    return event.get("requestContext", {}).get("authorizer", {}).get("claims", {})

def build_request_context(claims: dict, event: dict):
    # Single-tenant: the org (AIV) is fixed; do not trust any tenant claim.
    from agents.common.contracts.context import RequestContext, UserRole, DEFAULT_TENANT_ID
    groups = claims.get("cognito:groups", "").split(",") if claims.get("cognito:groups") else []
    # Default to the least-privileged role (volunteer) unless a valid group maps.
    role = UserRole.volunteer
    for g in groups:
        try:
            role = UserRole(g.strip())
            break
        except ValueError:
            continue
    return RequestContext(
        session_id=claims.get("session_id", str(uuid.uuid4())),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=claims.get("sub", "unknown"),
        user_role=role,
        source_ip=event.get("requestContext", {}).get("http", {}).get("sourceIp"),
    )
