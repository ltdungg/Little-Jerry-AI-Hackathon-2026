import boto3
import os
import structlog
from datetime import datetime
from lambdas.common.utils import build_response, build_error_response
from boto3.dynamodb.conditions import Key, Attr

logger = structlog.get_logger()
db = boto3.resource("dynamodb")
table = db.Table(os.environ.get("BUSINESS_DATA_TABLE", "BusinessData"))

def lambda_handler(event, context):
    tenant_id = event.get("tenant_id")
    project_id = event.get("project_id")

    if not tenant_id:
        return build_error_response(400, "BAD_REQUEST", "tenant_id is required")

    try:
        now = datetime.utcnow().isoformat()

        # Scan or query logic depending on table design
        # Assuming task structure allows filtering on due_date and status
        scan_kwargs = {
            "FilterExpression": Attr("due_date").lt(now) & Attr("status").ne("completed") & Attr("PK").eq(f"TENANT#{tenant_id}")
        }

        if project_id:
            scan_kwargs["FilterExpression"] = scan_kwargs["FilterExpression"] & Attr("project_id").eq(project_id)

        response = table.scan(**scan_kwargs)
        return build_response(200, response.get("Items", []))
    except Exception as e:
        logger.error("error_listing_overdue", error=str(e))
        return build_error_response(500, "INTERNAL_ERROR", "Failed to list overdue tasks")
