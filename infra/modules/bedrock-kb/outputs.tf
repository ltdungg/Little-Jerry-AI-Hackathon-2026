output "knowledge_base_id" {
  value = var.enable_kb ? awscc_bedrock_knowledge_base.this[0].knowledge_base_id : null
}

output "knowledge_base_arn" {
  value = var.enable_kb ? awscc_bedrock_knowledge_base.this[0].knowledge_base_arn : null
}

output "kb_role_arn" {
  value = var.enable_kb ? aws_iam_role.kb[0].arn : null
}

# Data source for a managed KB is connected separately (managed connectors:
# S3, SharePoint, Confluence, etc.). Kept for interface compatibility.
output "data_source_id" {
  value = null
}

# No self-managed vector store with managed KB.
output "collection_endpoint" {
  value = ""
}
