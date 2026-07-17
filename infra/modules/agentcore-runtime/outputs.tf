output "runtime_arns" {
  value = { for k, v in awscc_bedrockagentcore_runtime.agent : k => v.agent_runtime_arn }
}

output "runtime_ids" {
  value = { for k, v in awscc_bedrockagentcore_runtime.agent : k => v.agent_runtime_id }
}
