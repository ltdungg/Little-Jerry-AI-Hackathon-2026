# ---------- Ingestion ----------
module "ingestion" {
  source                = "../../modules/ingestion"
  project_name          = var.project_name
  environment           = var.environment
  sharepoint_lambda_arn = aws_lambda_function.sharepoint_sync.arn
  slack_lambda_arn      = aws_lambda_function.slack_sync.arn
}

# ---------- Ingestion Lambdas ----------
resource "aws_lambda_function" "sharepoint_sync" {
  function_name = "${var.project_name}-${var.environment}-sync-sharepoint"
  package_type  = "Image"
  image_uri     = data.aws_ecr_image.ingestion_latest.image_uri
  architectures = ["arm64"]
  role          = aws_iam_role.ingestion_lambda_role.arn
  memory_size   = 256
  timeout       = 300
  image_config {
    command = ["lambdas.ingestion.sync_sharepoint.lambda_handler"]
  }
  environment {
    variables = {
      BUSINESS_TABLE   = module.data.business_data_table_name
      RAW_BUCKET       = module.storage.raw_bucket_name
      CURATED_BUCKET   = module.storage.curated_bucket_name
      USE_FIXTURE_MODE = "true"
    }
  }
}

resource "aws_lambda_function" "slack_sync" {
  function_name = "${var.project_name}-${var.environment}-sync-slack"
  package_type  = "Image"
  image_uri     = data.aws_ecr_image.ingestion_latest.image_uri
  architectures = ["arm64"]
  role          = aws_iam_role.ingestion_lambda_role.arn
  memory_size   = 256
  timeout       = 300
  image_config {
    command = ["lambdas.ingestion.sync_slack.lambda_handler"]
  }
  environment {
    variables = {
      BUSINESS_TABLE   = module.data.business_data_table_name
      RAW_BUCKET       = module.storage.raw_bucket_name
      CURATED_BUCKET   = module.storage.curated_bucket_name
      USE_FIXTURE_MODE = "true"
    }
  }
}

resource "aws_iam_role" "ingestion_lambda_role" {
  name = "${var.project_name}-${var.environment}-ingestion"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ingestion_lambda" {
  name = "ingestion-policy"
  role = aws_iam_role.ingestion_lambda_role.id
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
          module.data.workflow_state_table_arn,
          "${module.data.workflow_state_table_arn}/index/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [module.storage.raw_bucket_arn, "${module.storage.raw_bucket_arn}/*", module.storage.curated_bucket_arn, "${module.storage.curated_bucket_arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "*"
      }
    ]
  })
}
