output "stack_id" {
  value = length(aws_cloudformation_stack.workaround) > 0 ? aws_cloudformation_stack.workaround[0].id : null
}

output "workaround_status" {
  value = var.enable_workaround ? "enabled" : "disabled"
}
