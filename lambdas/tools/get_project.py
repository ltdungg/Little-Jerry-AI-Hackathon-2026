import boto3
import os
import structlog
from lambdas.common.utils import build_response, build_error_response

logger = structlog.get_logger()
db = boto3.resource("dynamodb")
table = db.Table(os.environ.get("BUSINESS_DATA_TABLE", "BusinessData"))

def lambda_handler(event, context):
    tenant_id = event.get("tenant_id")
    project_id = event.get("project_id")

    if not tenant_id or not project_id:
        return build_error_response(400, "BAD_REQUEST", "tenant_id and project_id are required")

    try:
        response = table.get_item(Key={"PK": f"TENANT#{tenant_id}", "SK": f"PROJECT#{project_id}"})
        project = response.get("Item")

        if not project:
            return build_error_response(404, "NOT_FOUND", "Project not found")

        return build_response(200, project)
    except Exception as e:
        logger.error("error_fetching_project", error=str(e))
        return build_error_response(500, "INTERNAL_ERROR", "Failed to fetch project")
