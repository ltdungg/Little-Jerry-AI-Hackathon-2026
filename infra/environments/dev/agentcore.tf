# ---------- AgentCore Runtimes (via AWS Cloud Control provider) ----------
module "agentcore" {
  source       = "../../modules/agentcore-runtime"
  project_name = var.project_name
  environment  = var.environment
  agent_configs = {
    for name, cfg in var.agent_configs : name => {
      ecr_image_uri      = data.aws_ecr_image.agents_latest.image_uri
      execution_role_arn = aws_iam_role.agent_execution[name].arn
      model_id           = cfg.model_id
    }
  }
  tags                = var.resource_tags
  business_table_name = module.data.business_data_table_name
  memory_id           = module.agentcore_memory.memory_id
  aws_region          = var.aws_region
  knowledge_base_id   = module.bedrock_kb.knowledge_base_id
  artifact_bucket_name = module.storage.artifact_bucket_name
  gateway_env_vars = {
    GATEWAY_MCP_URL       = module.gateway.gateway_url
    GATEWAY_CLIENT_ID     = module.gateway.cognito_client_id
    GATEWAY_CLIENT_SECRET = module.gateway.cognito_client_secret
    GATEWAY_USER_POOL_ID  = module.gateway.cognito_user_pool_id
    GATEWAY_SCOPE         = module.gateway.gateway_scope
  }
}

# ---------- Tools Lambda for AgentCore Gateway ----------
resource "aws_lambda_function" "tools_lambda" {
  function_name = "${var.project_name}-${var.environment}-tools"
  package_type  = "Image"
  image_uri     = data.aws_ecr_image.api_latest.image_uri
  architectures = ["arm64"]
  role          = aws_iam_role.tools_lambda_role.arn
  memory_size   = 256
  timeout       = 30
  environment {
    variables = {
      BUSINESS_TABLE = module.data.business_data_table_name
      WORKFLOW_TABLE = module.data.workflow_state_table_name
      RAW_BUCKET     = module.storage.raw_bucket_name
      CURATED_BUCKET = module.storage.curated_bucket_name
      ARTIFACT_BUCKET = module.storage.artifact_bucket_name
      REGION         = var.aws_region
      PROJECT_NAME   = var.project_name
      ENVIRONMENT    = var.environment
      # AgentCore Gateway config for Jira MCP
      GATEWAY_MCP_URL       = module.gateway.gateway_url
      GATEWAY_CLIENT_ID     = module.gateway.cognito_client_id
      GATEWAY_CLIENT_SECRET = module.gateway.cognito_client_secret
      GATEWAY_USER_POOL_ID  = module.gateway.cognito_user_pool_id
      GATEWAY_SCOPE         = module.gateway.gateway_scope
    }
  }
  image_config {
    command = ["lambdas.tools.handler.lambda_handler"]
  }
  depends_on = [module.observability]
}

resource "aws_iam_role" "tools_lambda_role" {
  name = "${var.project_name}-${var.environment}-tools-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "tools_lambda" {
  name = "tools-lambda-policy"
  role = aws_iam_role.tools_lambda_role.id
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
        Sid      = "KmsDecryptBusinessData"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.security.kms_app_arn]
      }
    ]
  })
}

# ---------- AgentCore Memory: persistent conversation memory ----------
module "agentcore_memory" {
  source       = "../../modules/agentcore-memory"
  project_name = var.project_name
  environment  = var.environment
  event_expiry_days = 30
  tags                = var.resource_tags
}

# ---------- Agent Execution Roles ----------
resource "aws_iam_role" "agent_execution" {
  for_each = toset(keys(var.agent_configs))
  name     = "${var.project_name}-${var.environment}-${each.key}-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock-agentcore.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "agent_execution" {
  for_each = toset(keys(var.agent_configs))
  name     = "agent-execution"
  role     = aws_iam_role.agent_execution[each.value].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "InvokeModels"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"]
        Resource = "*"
      },
      {
        Sid      = "KnowledgeBaseRetrieval"
        Effect   = "Allow"
        Action   = ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate"]
        Resource = "*"
      },
      {
        # Orchestrator điều phối gọi các agent runtime con (multi-agent thật).
        Sid      = "InvokeSiblingRuntimes"
        Effect   = "Allow"
        Action   = ["bedrock-agentcore:InvokeAgentRuntime", "bedrock-agentcore:ListAgentRuntimes"]
        Resource = "*"
      },
      {
        # project_task agent đọc/viết task, risk, milestone thật trong DynamoDB.
        Sid      = "BusinessDataAccess"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"]
        Resource = [module.data.business_data_table_arn, "${module.data.business_data_table_arn}/index/*"]
      },
      {
        # Memory operations for conversation persistence.
        Sid      = "MemoryOperations"
        Effect   = "Allow"
        Action   = [
          "bedrock-agentcore:BatchCreateMemoryRecords",
          "bedrock-agentcore:RetrieveMemoryRecords",
          "bedrock-agentcore:ListMemoryRecords",
          "bedrock-agentcore:GetMemoryRecord",
        ]
        Resource = module.agentcore_memory.memory_arn
      },
      {
        Sid      = "KmsDecryptBusinessData"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.security.kms_app_arn]
      },
      {
        # MCP client reads admin tokens from Secrets Manager for Jira/Slack integration.
        Sid      = "SecretsManagerAccess"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.jira_admin_access_token.arn,
          aws_secretsmanager_secret.slack_admin_access_token.arn,
        ]
      },
      {
        Sid      = "PullContainerImage"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"]
        Resource = "*"
      },
      {
        Sid      = "Logging"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ---------- Jira Webhook Receiver Lambda ----------
resource "aws_lambda_function" "jira_webhook" {
  function_name = "${var.project_name}-${var.environment}-jira-webhook"
  package_type  = "Image"
  image_uri     = data.aws_ecr_image.api_latest.image_uri
  architectures = ["arm64"]
  role          = aws_iam_role.jira_webhook_role.arn
  memory_size   = 256
  timeout       = 30
  environment {
    variables = {
      BUSINESS_TABLE = module.data.business_data_table_name
      REGION         = var.aws_region
    }
  }
  image_config {
    command = ["lambdas.jira_webhook.handler.lambda_handler"]
  }
  depends_on = [module.observability]
}

resource "aws_iam_role" "jira_webhook_role" {
  name = "${var.project_name}-${var.environment}-jira-webhook"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "jira_webhook" {
  name = "jira-webhook-policy"
  role = aws_iam_role.jira_webhook_role.id
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
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"]
        Resource = [
          module.data.business_data_table_arn,
          "${module.data.business_data_table_arn}/index/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.slack_admin_access_token.arn,
        ]
      }
    ]
  })
}

# ---------- Jira Webhook API Gateway integration (reuses existing slack_bot.tf API) ----------
resource "aws_apigatewayv2_integration" "jira_webhook" {
  api_id                 = module.api.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.jira_webhook.invoke_arn
  integration_method     = "POST"
}

resource "aws_apigatewayv2_route" "jira_webhook" {
  api_id    = module.api.api_id
  route_key = "POST /jira/webhook"
  target    = "integrations/${aws_apigatewayv2_integration.jira_webhook.id}"
}

resource "aws_lambda_permission" "jira_webhook_apigw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.jira_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${module.api.api_id}/*/*/jira/webhook"
}

output "jira_webhook_url" {
  value = "${module.api.api_url}/jira/webhook"
}
