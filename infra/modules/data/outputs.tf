# ── BusinessData Table ──
output "business_data_table_name" {
  value       = aws_dynamodb_table.business_data.name
  description = "Name of the BusinessData DynamoDB table"
}

output "business_data_table_arn" {
  value       = aws_dynamodb_table.business_data.arn
  description = "ARN of the BusinessData DynamoDB table"
}

output "business_data_table_id" {
  value       = aws_dynamodb_table.business_data.id
  description = "ID of the BusinessData DynamoDB table"
}

output "business_data_stream_arn" {
  value       = var.enable_streams ? aws_dynamodb_table.business_data.stream_arn : ""
  description = "Stream ARN of the BusinessData table (if streams enabled)"
}

output "business_data_gsi_names" {
  value       = ["gsi1-user-assignment", "gsi2-entity-status"]
  description = "Names of GSIs on the BusinessData table"
}

# ── WorkflowState Table ──
output "workflow_state_table_name" {
  value       = aws_dynamodb_table.workflow_state.name
  description = "Name of the WorkflowState DynamoDB table"
}

output "workflow_state_table_arn" {
  value       = aws_dynamodb_table.workflow_state.arn
  description = "ARN of the WorkflowState DynamoDB table"
}

output "workflow_state_table_id" {
  value       = aws_dynamodb_table.workflow_state.id
  description = "ID of the WorkflowState DynamoDB table"
}

output "workflow_state_stream_arn" {
  value       = var.enable_streams ? aws_dynamodb_table.workflow_state.stream_arn : ""
  description = "Stream ARN of the WorkflowState table (if streams enabled)"
}

output "workflow_state_gsi_names" {
  value       = ["gsi1-workflow-status"]
  description = "Names of GSIs on the WorkflowState table"
}

# ── All tables summary ──
output "all_table_names" {
  value = [
    aws_dynamodb_table.business_data.name,
    aws_dynamodb_table.workflow_state.name,
  ]
  description = "List of all DynamoDB table names"
}

output "all_table_arns" {
  value = [
    aws_dynamodb_table.business_data.arn,
    aws_dynamodb_table.workflow_state.arn,
  ]
  description = "List of all DynamoDB table ARNs"
}
