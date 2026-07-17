import os
import boto3
import structlog
from datetime import datetime, timezone

logger = structlog.get_logger()
bedrock = boto3.client("bedrock-agent")
dynamodb = boto3.resource("dynamodb")

WORKFLOW_TABLE = os.environ.get("WORKFLOW_TABLE", "npo-ai-dev-workflow-state")

def lambda_handler(event, context):
    kb_id = event["kb_id"]
    data_source_id = event["data_source_id"]
    tenant_id = event.get("tenant_id", "tenant-aiv")
    source = event.get("source", "unknown")

    table = dynamodb.Table(WORKFLOW_TABLE)

    # Check for concurrent ingestion
    existing = table.get_item(Key={"PK": f"KB_INGESTION#{tenant_id}#{source}", "SK": "CURRENT_JOB"})
    if "Item" in existing and existing["Item"].get("status") == "running":
        logger.warning("concurrent_ingestion_blocked", tenant_id=tenant_id, source=source)
        return {"statusCode": 409, "body": {"error": "Concurrent ingestion already running"}}

    # Start ingestion job
    response = bedrock.start_ingestion_job(
        knowledgeBaseId=kb_id,
        dataSourceId=data_source_id,
    )

    job_id = response["ingestionJob"]["ingestionJobId"]

    # Record job
    table.put_item(Item={
        "PK": f"KB_INGESTION#{tenant_id}#{source}",
        "SK": "CURRENT_JOB",
        "job_id": job_id,
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
    })

    logger.info("kb_ingestion_started", kb_id=kb_id, job_id=job_id, source=source)
    return {"statusCode": 200, "body": {"job_id": job_id, "status": "started"}}
