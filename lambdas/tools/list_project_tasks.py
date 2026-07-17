import boto3
import os
import structlog
from lambdas.common.utils import build_response, build_error_response
from boto3.dynamodb.conditions import Key

logger = structlog.get_logger()
db = boto3.resource("dynamodb")
table = db.Table(os.environ.get("BUSINESS_DATA_TABLE", "BusinessData"))

def lambda_handler(event, context):
    tenant_id = event.get("tenant_id")
    project_id = event.get("project_id")
    status_filter = event.get("status_filter")

    if not tenant_id or not project_id:
        return build_error_response(400, "BAD_REQUEST", "tenant_id and project_id are required")

    try:
        query_params = {
            "KeyConditionExpression": Key("PK").eq(f"TENANT#{tenant_id}") & Key("SK").begins_with(f"TASK#{project_id}#")
        }

        if status_filter:
            query_params["FilterExpression"] = Key("status").eq(status_filter)

        response = table.query(**query_params)
        return build_response(200, response.get("Items", []))
    except Exception as e:
        logger.error("error_listing_tasks", error=str(e))
        return build_error_response(500, "INTERNAL_ERROR", "Failed to list tasks")
