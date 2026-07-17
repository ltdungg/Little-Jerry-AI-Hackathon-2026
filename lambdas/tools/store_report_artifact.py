import boto3
import os
import structlog
from lambdas.common.utils import build_response, build_error_response

logger = structlog.get_logger()
s3 = boto3.client("s3")
db = boto3.resource("dynamodb")
bucket = os.environ.get("ARTIFACTS_BUCKET", "npo-artifacts")
table = db.Table(os.environ.get("REPORTS_TABLE", "Reports"))

def lambda_handler(event, context):
    try:
        # Save content to S3
        key = f"reports/{event['workflow_id']}/{event['report_type']}.json"
        s3.put_object(Bucket=bucket, Key=key, Body=event["content"])

        # Save metadata to DynamoDB
        table.put_item(Item={
            "PK": f"TENANT#{event['tenant_id']}",
            "SK": f"REPORT#{event['workflow_id']}",
            "metadata": event["metadata"]
        })

        return build_response(201, {"report_id": event['workflow_id']})
    except Exception as e:
        logger.error("artifact_storage_failed", error=str(e))
        return build_error_response(500, "INTERNAL_ERROR", "Failed to store artifact")
