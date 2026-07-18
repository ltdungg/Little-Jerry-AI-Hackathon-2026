###
# IAM Role and policies for Message Receiver Lambda
###

resource "aws_iam_role" "receiver_role" {
  name               = "${var.project_name}-${var.environment}-slack-ReceiverRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "invoke_lambda" {
  name = "InvokeLambda"
  role = aws_iam_role.receiver_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.invoker.arn,
          "${aws_lambda_function.invoker.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "receiver_cloudwatch" {
  name = "Cloudwatch"
  role = aws_iam_role.receiver_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "logs:CreateLogGroup"
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-slack-Receiver:*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "secrets_manager" {
  name = "SecretsManager"
  role = aws_iam_role.receiver_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:*"
      }
    ]
  })
}

###
# Build receiver lambda
###

data "archive_file" "receiver_lambda" {
  type        = "zip"
  source_file = "${path.module}/src/slack/receiver.py"
  output_path = "${path.module}/slack_receiver.zip"
}

resource "aws_lambda_function" "receiver" {
  filename      = "${path.module}/slack_receiver.zip"
  function_name = "${var.project_name}-${var.environment}-slack-Receiver"
  role          = aws_iam_role.receiver_role.arn
  handler       = "receiver.lambda_handler"
  timeout       = 10
  memory_size   = 512
  runtime       = "python3.12"
  architectures = ["arm64"]

  source_code_hash = data.archive_file.receiver_lambda.output_base64sha256

  environment {
    variables = {
      INVOKER_FUNCTION_NAME = aws_lambda_function.invoker.function_name
      SECRET_NAME           = aws_secretsmanager_secret.slack_admin_access_token.name
    }
  }
}

###
# Build invoker lambda
###

data "archive_file" "invoker_lambda" {
  type        = "zip"
  source_file = "${path.module}/src/slack/invoker.py"
  output_path = "${path.module}/slack_invoker.zip"
}

resource "aws_lambda_function" "invoker" {
  filename      = "${path.module}/slack_invoker.zip"
  function_name = "${var.project_name}-${var.environment}-slack-Invoker"
  role          = aws_iam_role.invoker_role.arn
  handler       = "invoker.lambda_handler"
  timeout       = 900
  memory_size   = 256
  runtime       = "python3.12"
  architectures = ["arm64"]

  source_code_hash = data.archive_file.invoker_lambda.output_base64sha256

  environment {
    variables = {
      AGENT_RUNTIME_ARN = module.agentcore.runtime_arns["orchestrator"]
    }
  }
}

###
# IAM Role and policies for Invoker Lambda
###

resource "aws_iam_role" "invoker_role" {
  name               = "${var.project_name}-${var.environment}-slack-InvokerRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "bedrock_agentcore" {
  name = "InvokeAgentRuntime"
  role = aws_iam_role.invoker_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock-agentcore:InvokeAgentRuntime"
        ]
        Resource = [
          module.agentcore.runtime_arns["orchestrator"],
          "${module.agentcore.runtime_arns["orchestrator"]}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "invoker_cloudwatch" {
  name = "Cloudwatch"
  role = aws_iam_role.invoker_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "logs:CreateLogGroup"
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-slack-Invoker:*"
        ]
      }
    ]
  })
}

resource "aws_lambda_function_url" "receiver_slack_trigger_function_url" {
  function_name      = aws_lambda_function.receiver.function_name
  authorization_type = "NONE"
}

output "receiver_slack_trigger_function_url" {
  value = aws_lambda_function_url.receiver_slack_trigger_function_url.function_url
}

resource "aws_lambda_permission" "receiver_public_access" {
  statement_id           = "AllowPublicInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.receiver.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
resource "aws_apigatewayv2_integration" "slack_receiver" {
  api_id             = module.api.api_id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.receiver.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "slack_receiver" {
  api_id    = module.api.api_id
  route_key = "POST /slack/events"
  target    = "integrations/${aws_apigatewayv2_integration.slack_receiver.id}"
}

resource "aws_lambda_permission" "api_gateway_slack" {
  statement_id  = "AllowExecutionFromAPIGatewaySlack"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.receiver.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${module.api.api_id}/*/*/slack/events"
}

output "receiver_slack_apigw_url" {
  value = "${module.api.api_url}/slack/events"
}
