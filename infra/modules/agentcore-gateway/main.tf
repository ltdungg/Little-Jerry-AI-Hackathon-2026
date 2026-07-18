resource "aws_cloudformation_stack" "gateway" {
  name = "${var.project_name}-${var.environment}-agentcore-gateway"
  template_body = jsonencode({
    Resources = {
      Gateway = {
        Type = "AWS::BedrockAgentCore::Gateway"
        Properties = {
          GatewayName = "${var.project_name}-${var.environment}-gateway"
          Targets     = [for name, cfg in var.http_targets : merge(
            { 
              Name        = name, 
              EndpointUrl = cfg.endpoint_url
            },
            cfg.secret_arn != null ? { SecretArn = cfg.secret_arn } : {}
          )]
        }
      }
    }
    Outputs = {
      GatewayId = { Value = { Ref = "Gateway" } }
    }
  })
  tags = var.tags
}
