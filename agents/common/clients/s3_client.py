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

def store_report_pdf(bucket: str, tenant_id: str, project_id: str, report_id: str, pdf_bytes: bytes) -> str:
    """Store an exported report PDF, following the artifact key convention
    (data-model.md mục 10.4): <tenantId>/<projectId>/reports/<reportId>.pdf.
    Returns the s3:// URI."""
    s3 = boto3.client('s3')
    key = f"{tenant_id}/{project_id}/reports/{report_id}.pdf"
    s3.put_object(Bucket=bucket, Key=key, Body=pdf_bytes, ContentType="application/pdf")
    return f"s3://{bucket}/{key}"

def presign_s3_uri(s3_uri: str, expires_in: int = 900) -> str:
    """Turn an s3:// URI into a short-lived presigned HTTPS download URL
    (docs/REPORT-EXPORT-SPEC.md mục 5.4 — never proxy the file through Lambda)."""
    s3 = boto3.client('s3')
    without_scheme = s3_uri.removeprefix("s3://")
    bucket, key = without_scheme.split("/", 1)
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )
