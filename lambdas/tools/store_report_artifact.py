"""Gateway tool: persist a report artifact consistently with the
BusinessData `Report` items used by the REST API (docs/REPORT-EXPORT-SPEC.md)
instead of the standalone `Reports` table this used before."""
import os
import uuid
from datetime import datetime, timezone

import structlog

from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.clients.s3_client import store_report_artifact as _put_s3_artifact
from lambdas.common.utils import build_response, build_error_response

logger = structlog.get_logger()

ARTIFACT_BUCKET = os.environ.get("ARTIFACT_BUCKET", "")


def lambda_handler(event, context):
    tenant_id = event["tenant_id"]
    workflow_id = event["workflow_id"]
    report_type = event["report_type"]
    content = event["content"]
    project_id = event.get("project_id", "")
    report_id = event.get("report_id") or str(uuid.uuid4())

    artifact_id = f"art-{uuid.uuid4().hex[:12]}"
    s3_uri = None
    try:
        if ARTIFACT_BUCKET:
            _put_s3_artifact(
                bucket=ARTIFACT_BUCKET,
                tenant_id=tenant_id,
                workflow_id=workflow_id,
                artifact_id=artifact_id,
                content=content,
            )
            s3_uri = f"s3://{ARTIFACT_BUCKET}/{tenant_id}/{workflow_id}/artifacts/{artifact_id}.json"

        if project_id:
            now = datetime.now(timezone.utc).isoformat()
            client = BusinessDataClient(tenant_id=tenant_id)
            client.put_report(project_id, {
                "report_id": report_id,
                "project_id": project_id,
                "workflow_id": workflow_id,
                "report_type": report_type,
                "category": event.get("category", "manual"),
                "content": content,
                "status": "draft",
                "artifact_s3_uri": s3_uri,
                "created_at": now,
                "generated_at": now,
            })

        return build_response(201, {"report_id": report_id, "s3_uri": s3_uri})
    except Exception as e:
        logger.error("artifact_storage_failed", error=str(e))
        return build_error_response(500, "INTERNAL_ERROR", "Failed to store artifact")
