##
# Gateway IAM Role
##

resource "aws_iam_role" "gateway" {
  name = "${var.gateway_name}ExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "bedrock-agentcore.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
        }
      }
    }]
  })

  tags = {
    Name        = "${var.gateway_name}ExecutionRole"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

##
# IAM Policy - Secrets Manager Access
##

resource "aws_iam_role_policy" "gateway_secrets" {
  name = "SecretsManagerAccess"
  role = aws_iam_role.gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
      ]
      Resource = [
        "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:bedrock-agentcore-identity!default/apikey/*",
      ]
    }]
  })
}

##
# IAM Policy - S3 Schema Access
##

resource "aws_iam_role_policy" "gateway_s3" {
  name = "S3SchemaAccess"
  role = aws_iam_role.gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.custom_schemas.arn,
        "${aws_s3_bucket.custom_schemas.arn}/*",
        "arn:aws:s3:::amazonbedrockagentcore-built-sampleschemas*",
        "arn:aws:s3:::amazonbedrockagentcore-built-sampleschemas*/*"
      ]
    }]
  })
}

##
# IAM Policy - Workload Identity and Token Vault Access
##
resource "aws_iam_role_policy" "gateway_workload_identity" {
  name = "WorkloadIdentityAccess"
  role = aws_iam_role.gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["bedrock-agentcore:GetWorkloadAccessToken"]
        Resource = [
          "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:workload-identity-directory/default",
          "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:workload-identity-directory/default/workload-identity/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["bedrock-agentcore:GetResourceApiKey"]
        Resource = [
          "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:workload-identity-directory/default",
          "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:workload-identity-directory/default/workload-identity/*",
          "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:token-vault/default",
          "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:token-vault/default/apikeycredentialprovider/*"
        ]
      }
    ]
  })
}

resource "aws_cloudformation_stack" "gateway" {
  name = var.gateway_name
  template_body = jsonencode({
    AWSTemplateFormatVersion = "2010-09-09"
    Resources = {
      Gateway = {
        Type = "AWS::BedrockAgentCore::Gateway"
        Properties = {
          Name = var.gateway_name
          Description = "Unified MCP gateway for ${var.runtime_name} - all platform integrations"
          ProtocolType = "MCP"
          ProtocolConfiguration = {
            Mcp = {
              SupportedVersions = ["2025-03-26", "2025-06-18", "2025-11-25"]
              SearchType = "SEMANTIC"
            }
          }
          AuthorizerType = "CUSTOM_JWT"
          AuthorizerConfiguration = {
            CustomJWTAuthorizer = {
              DiscoveryUrl = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.gateway.id}/.well-known/openid-configuration"
              AllowedClients = [aws_cognito_user_pool_client.gateway.id]
            }
          }
          RoleArn = aws_iam_role.gateway.arn
          ExceptionLevel = "DEBUG"
        }
      }
    }
    Outputs = {
      GatewayUrl = {
        Value = {"Fn::GetAtt": ["Gateway", "GatewayUrl"]}
      }
      GatewayId = {
        Value = {"Fn::GetAtt": ["Gateway", "GatewayIdentifier"]}
      }
    }
  })
}
