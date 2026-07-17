import uuid
import structlog
from lambdas.common.utils import build_response, build_error_response

logger = structlog.get_logger()

def lambda_handler(event, context):
    required = ["tenant_id", "project_id", "title"]
    if not all(k in event for k in required):
        return build_error_response(400, "BAD_REQUEST", "Missing required fields")

    # Dry-run logic: Generate token, prepare diff
    confirmation_token = str(uuid.uuid4())

    proposed_change = {
        "diff": {"title": event["title"], "assignee": event.get("assignee")},
        "confirmation_token": confirmation_token
    }

    logger.info("task_change_proposed", token=confirmation_token)
    return build_response(200, proposed_change)
