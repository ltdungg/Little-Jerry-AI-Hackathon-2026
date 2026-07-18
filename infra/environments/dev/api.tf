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
      ORCHESTRATOR_RUNTIME_ARN = module.agentcore.runtime_arns["orchestrator"]
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
        Action   = ["bedrock:InvokeAgent", "bedrock-agentcore:InvokeAgentRuntime"]
        Resource = "*"
      },
      {
        # Bảng BusinessData/WorkflowState mã hóa bằng KMS CMK -> cần quyền giải mã.
        Sid      = "KmsDecryptBusinessData"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.security.kms_app_arn]
      }
    ]
  })
}
