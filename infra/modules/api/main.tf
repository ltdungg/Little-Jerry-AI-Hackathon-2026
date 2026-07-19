resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_authorizer" "auth" {
  api_id           = aws_apigatewayv2_api.api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"
  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

locals {
  routes = [
    "GET /health",
    "POST /v1/chat",
    "GET /v1/admin/auth/jira/login",
    "GET /v1/admin/auth/jira/callback",
    "GET /v1/admin/auth/slack/login",
    "GET /v1/admin/auth/slack/callback",
    "GET /{proxy+}",
    "POST /{proxy+}",
    "PUT /{proxy+}",
    "PATCH /{proxy+}",
    "DELETE /{proxy+}"
  ]
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.api_lambda_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each           = toset(local.routes)
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorizer_id      = length(regexall(".*\\{proxy\\+\\}.*", each.value)) > 0 && each.value != "POST /v1/chat" ? aws_apigatewayv2_authorizer.auth.id : null
  authorization_type = length(regexall(".*\\{proxy\\+\\}.*", each.value)) > 0 && each.value != "POST /v1/chat" ? "JWT" : "NONE"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.api_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_burst_limit = 1000
    throttling_rate_limit  = 500
  }
}
