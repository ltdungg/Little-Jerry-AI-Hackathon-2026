resource "aws_cloudformation_stack" "gateway" {
  name = "${var.project_name}-${var.environment}-agentcore-gateway"
  template_body = jsonencode({
    Resources = {
      Gateway = {
        Type = "AWS::BedrockAgentCore::Gateway"
        Properties = {
          GatewayName = "${var.project_name}-${var.environment}-gateway"
          Targets     = [for name, arn in var.lambda_target_arns : { Name = name, TargetArn = arn }]
        }
      }
    }
    Outputs = {
      GatewayId = { Value = { Ref = "Gateway" } }
    }
  })
  tags = var.tags
}
