##
# Gateway Target - Jira
##

resource "aws_cloudcontrolapi_resource" "jira_target" {
  type_name = "AWS::BedrockAgentCore::GatewayTarget"
  desired_state = jsonencode({
    GatewayIdentifier = "npo-ai-dev-gateway-v4-d53tw35jzc"
    Name              = "jira"
    TargetConfiguration = {
      Mcp = {
        OpenApiSchema = {
          S3 = {
            Uri = "s3://${aws_s3_bucket.custom_schemas.id}/${aws_s3_object.jira_schema.key}"
          }
        }
      }
    }
    CredentialProviderConfigurations = [
      {
        CredentialProviderType = "API_KEY"
        CredentialProvider = {
          ApiKeyCredentialProvider = {
            ProviderArn        = "arn:aws:bedrock-agentcore:ap-southeast-2:314567759962:token-vault/default/apikeycredentialprovider/atlassian-jira"
            CredentialPrefix   = "Basic"
            CredentialLocation = "HEADER"
          }
        }
      }
    ]
  })
}

##
# Gateway Target - Confluence
##

resource "aws_cloudcontrolapi_resource" "confluence_target" {
  type_name = "AWS::BedrockAgentCore::GatewayTarget"
  desired_state = jsonencode({
    GatewayIdentifier = "npo-ai-dev-gateway-v4-d53tw35jzc"
    Name              = "confluence"
    TargetConfiguration = {
      Mcp = {
        OpenApiSchema = {
          S3 = {
            Uri = "s3://${aws_s3_bucket.custom_schemas.id}/${aws_s3_object.confluence_schema.key}"
          }
        }
      }
    }
    CredentialProviderConfigurations = [
      {
        CredentialProviderType = "API_KEY"
        CredentialProvider = {
          ApiKeyCredentialProvider = {
            ProviderArn        = "arn:aws:bedrock-agentcore:ap-southeast-2:314567759962:token-vault/default/apikeycredentialprovider/atlassian-jira"
            CredentialPrefix   = "Basic"
            CredentialLocation = "HEADER"
          }
        }
      }
    ]
  })
}
