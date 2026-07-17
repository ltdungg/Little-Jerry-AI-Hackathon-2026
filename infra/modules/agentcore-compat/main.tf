resource "aws_cloudformation_stack" "workaround" {
  count = var.enable_workaround ? 1 : 0
  name  = "${var.project_name}-${var.environment}-agentcore-compat"
  template_body = jsonencode({
    Resources = {
      WorkaroundTrigger = {
        Type = "AWS::CloudFormation::WaitConditionHandle"
      }
    }
  })
}

resource "null_resource" "cli_workaround" {
  count = var.enable_workaround ? length(var.workaround_commands) : 0
  triggers = {
    command = var.workaround_commands[count.index]
  }
  provisioner "local-exec" {
    command = self.triggers.command
  }
}
