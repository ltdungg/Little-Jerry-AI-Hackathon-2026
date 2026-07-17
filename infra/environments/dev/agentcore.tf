# ---------- AgentCore Runtimes (via AWS Cloud Control provider) ----------
module "agentcore" {
  source       = "../../modules/agentcore-runtime"
  project_name = var.project_name
  environment  = var.environment
  agent_configs = {
    for name, cfg in var.agent_configs : name => {
      ecr_image_uri      = "${module.ecr.repository_urls["agents"]}:${var.image_tag}"
      execution_role_arn = aws_iam_role.agent_execution[name].arn
      model_id           = cfg.model_id
    }
  }
  tags                = var.resource_tags
  business_table_name = module.data.business_data_table_name
  aws_region          = var.aws_region
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
        Sid      = "KmsDecryptBusinessData"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.security.kms_app_arn]
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
