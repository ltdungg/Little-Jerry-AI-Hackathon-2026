# ---------- Report scheduler (docs/REPORT-EXPORT-SPEC.md muc 6) ----------
module "report_scheduler" {
  source             = "../../modules/report-scheduler"
  project_name       = var.project_name
  environment        = var.environment
  report_lambda_arn  = aws_lambda_function.generate_daily_reports.arn
  report_lambda_name = aws_lambda_function.generate_daily_reports.function_name
}

# Reuses the api image (lambdas/Dockerfile already copies shared/ and
# agents/common/, both of which lambdas.scheduled.generate_daily_reports needs)
# with a different image_config command, same pattern as the ingestion Lambdas.
resource "aws_lambda_function" "generate_daily_reports" {
  function_name = "${var.project_name}-${var.environment}-generate-daily-reports"
  package_type  = "Image"
  image_uri     = data.aws_ecr_image.api_latest.image_uri
  architectures = ["arm64"]
  role          = aws_iam_role.report_lambda_role.arn
  memory_size   = 512
  timeout       = 120
  image_config {
    command = ["lambdas.scheduled.generate_daily_reports.lambda_handler"]
  }
  environment {
    variables = {
      BUSINESS_TABLE        = module.data.business_data_table_name
      REGION                = var.aws_region
      REPORT_TIMEZONE       = "Asia/Ho_Chi_Minh"
      WEEKLY_REPORT_WEEKDAY = "6"
    }
  }
  depends_on = [module.observability]
}

resource "aws_iam_role" "report_lambda_role" {
  name = "${var.project_name}-${var.environment}-report-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "report_lambda" {
  name = "report-lambda-policy"
  role = aws_iam_role.report_lambda_role.id
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
        Sid      = "KmsDecryptBusinessData"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [module.security.kms_app_arn]
      }
    ]
  })
}
