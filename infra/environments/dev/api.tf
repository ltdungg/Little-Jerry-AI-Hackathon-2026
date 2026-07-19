# ---------- API Gateway ----------
module "api" {
  source                = "../../modules/api"
  project_name          = var.project_name
  environment           = var.environment
  api_lambda_arn        = aws_lambda_function.api_lambda.invoke_arn
  api_lambda_name       = aws_lambda_function.api_lambda.function_name
  cognito_user_pool_id  = module.auth.user_pool_id
  cognito_client_id     = module.auth.client_id
  allowed_origins       = var.allowed_origins
  aws_region            = var.aws_region
}

# ---------- API Lambda ----------
resource "aws_lambda_function" "api_lambda" {
  function_name = "${var.project_name}-${var.environment}-api"
  package_type  = "Image"
  image_uri     = data.aws_ecr_image.api_latest.image_uri
  architectures = ["arm64"]
  role          = aws_iam_role.api_lambda_role.arn
  memory_size   = 512
  timeout       = 30
  environment {
    variables = {
      BUSINESS_TABLE  = module.data.business_data_table_name
      WORKFLOW_TABLE  = module.data.workflow_state_table_name
      RAW_BUCKET      = module.storage.raw_bucket_name
      CURATED_BUCKET  = module.storage.curated_bucket_name
      ARTIFACT_BUCKET          = module.storage.artifact_bucket_name
      REGION                   = var.aws_region
      PROJECT_NAME             = var.project_name
      ENVIRONMENT              = var.environment
      ORCHESTRATOR_RUNTIME_ARN = module.agentcore.runtime_arns["orchestrator"]
      BACKUP_RUNTIME_ARN       = module.agentcore.runtime_arns["backup"]
      KNOWLEDGE_BASE_ID        = module.bedrock_kb.knowledge_base_id
      # Web authentication (frontend login via Cognito)
      COGNITO_USER_POOL_ID     = module.auth.user_pool_id
      COGNITO_CLIENT_ID        = module.auth.client_id
      # Gateway MCP authentication (uses same Cognito pool as web auth)
      GATEWAY_MCP_URL               = module.gateway.gateway_url
      GATEWAY_COGNITO_CLIENT_ID     = module.auth.gateway_client_id
      GATEWAY_COGNITO_CLIENT_SECRET = module.auth.gateway_client_secret
      GATEWAY_COGNITO_USER_POOL_ID  = module.auth.user_pool_id
      GATEWAY_COGNITO_SCOPE         = module.auth.gateway_scope
    }
  }
  depends_on = [module.observability]
}

resource "aws_iam_role" "api_lambda_role" {
  name = "${var.project_name}-${var.environment}-api-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "api_lambda" {
  name = "api-lambda-policy"
  role = aws_iam_role.api_lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"]
        Resource = [
          module.data.business_data_table_arn,
          "${module.data.business_data_table_arn}/index/*",
          module.data.workflow_state_table_arn,
          "${module.data.workflow_state_table_arn}/index/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${module.storage.curated_bucket_arn}/*", "${module.storage.artifact_bucket_arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:Retrieve"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeAgent", "bedrock-agentcore:InvokeAgentRuntime"]
        Resource = "*"
      },
      {
        Sid      = "CognitoAdminActions"
        Effect   = "Allow"
        Action   = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminAddUserToGroup"
        ]
        Resource = "*"
      },
      {
        # Bảng BusinessData/WorkflowState mã hóa bằng KMS CMK -> cần quyền giải mã.
        Sid      = "KmsDecryptBusinessData"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.security.kms_app_arn]
      },
      {
        # OAuth flow reads client credentials and stores admin tokens in Secrets Manager.
        Sid      = "SecretsManagerOAuth"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:PutSecretValue"]
        Resource = [
          aws_secretsmanager_secret.slack_client_id.arn,
          aws_secretsmanager_secret.slack_client_secret.arn,
          aws_secretsmanager_secret.jira_admin_access_token.arn,
          aws_secretsmanager_secret.slack_admin_access_token.arn,
        ]
      }
    ]
  })
}
