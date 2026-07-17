import boto3

def store_curated_document(bucket: str, tenant_id: str, project_id: str, source: str, document_id: str, content: str, metadata: dict):
    s3 = boto3.client('s3')
    key = f"{tenant_id}/{project_id}/{source}/{document_id}.json"
    s3.put_object(Bucket=bucket, Key=key, Body=content)

def store_report_artifact(bucket: str, tenant_id: str, workflow_id: str, artifact_id: str, content: str):
    s3 = boto3.client('s3')
    key = f"{tenant_id}/{workflow_id}/artifacts/{artifact_id}.json"
    s3.put_object(Bucket=bucket, Key=key, Body=content)

def get_document(bucket: str, key: str) -> str:
    s3 = boto3.client('s3')
    response = s3.get_object(Bucket=bucket, Key=key)
    return response['Body'].read().decode('utf-8')
