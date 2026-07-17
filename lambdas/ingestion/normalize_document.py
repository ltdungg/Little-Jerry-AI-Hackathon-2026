import hashlib
import json
import os
import boto3
import structlog

logger = structlog.get_logger()
s3 = boto3.client("s3")

CURATED_BUCKET = os.environ["CURATED_BUCKET"]

def lambda_handler(event, context):
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]

        # Download raw document
        response = s3.get_object(Bucket=bucket, Key=key)
        raw_content = response["Body"].read().decode("utf-8")
        raw_data = json.loads(raw_content)

        # Normalize
        normalized = {
            "title": raw_data.get("title", "Untitled"),
            "content": raw_data.get("text", raw_data.get("content", "")),
            "source_system": raw_data.get("source_system", "unknown"),
            "source_id": raw_data.get("source_id", key),
            "tenant_id": raw_data.get("tenant_id", "tenant-aiv"),
            "project_id": raw_data.get("project_id", "general"),
        }

        content_hash = hashlib.sha256(normalized["content"].encode()).hexdigest()

        # Write curated document
        curated_key = f"{normalized['tenant_id']}/{normalized['project_id']}/{normalized['source_system']}/{normalized['source_id']}.txt"
        s3.put_object(Bucket=CURATED_BUCKET, Key=curated_key, Body=normalized["content"].encode())

        # Write metadata
        metadata = {
            **normalized,
            "allowed_roles": raw_data.get("allowed_roles", ["npo_staff", "project_manager"]),
            "allowed_user_ids": raw_data.get("allowed_user_ids", []),
            "classification": raw_data.get("classification", "internal"),
            "content_hash": content_hash,
            "last_modified_at": raw_data.get("last_modified_at", ""),
        }
        meta_key = curated_key.replace(".txt", ".metadata.json")
        s3.put_object(Bucket=CURATED_BUCKET, Key=meta_key, Body=json.dumps(metadata).encode())

        logger.info("document_normalized", source=normalized["source_system"], key=curated_key)

    return {"statusCode": 200, "body": json.dumps({"status": "ok", "processed": len(event.get("Records", []))})}
