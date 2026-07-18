##
# Gateway Target - Jira
##

resource "aws_cloudcontrolapi_resource" "jira_target" {
  type_name = "AWS::BedrockAgentCore::GatewayTarget"
  desired_state = jsonencode({
    GatewayIdentifier = awscc_bedrockagentcore_gateway.main.gateway_identifier
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
        ApiKeyCredentialProviderConfiguration = {
          ProviderArn        = "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:token-vault/default/apikeycredentialprovider/atlassian-vera"
          CredentialPrefix   = "Basic"
          CredentialLocation = "HEADER"
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
    GatewayIdentifier = awscc_bedrockagentcore_gateway.main.gateway_identifier
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
        ApiKeyCredentialProviderConfiguration = {
          ProviderArn        = "arn:aws:bedrock-agentcore:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:token-vault/default/apikeycredentialprovider/atlassian-vera"
          CredentialPrefix   = "Basic"
          CredentialLocation = "HEADER"
        }
      }
    ]
  })
}
