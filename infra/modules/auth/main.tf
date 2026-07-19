resource "aws_cognito_user_pool" "pool" {
  name = "${var.project_name}-${var.environment}-pool"
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  auto_verified_attributes = ["email"]
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

# Web app client (code flow for frontend login)
resource "aws_cognito_user_pool_client" "client" {
  name                                 = "${var.project_name}-${var.environment}-client"
  user_pool_id                         = aws_cognito_user_pool.pool.id
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH"]
  prevent_user_existence_errors        = "ENABLED"
}

# Resource server for Gateway MCP scopes
resource "aws_cognito_resource_server" "gateway" {
  identifier   = "${var.project_name}-${var.environment}-gateway"
  name         = "${var.project_name}-${var.environment}-gateway"
  user_pool_id = aws_cognito_user_pool.pool.id

  scope {
    scope_name        = "invoke"
    scope_description = "Invoke AgentCore Gateway MCP tools"
  }
}

# Client credentials app client for Gateway MCP (machine-to-machine)
resource "aws_cognito_user_pool_client" "gateway_client" {
  name         = "${var.project_name}-${var.environment}-gateway-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret                      = true
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes = [
    "${aws_cognito_resource_server.gateway.identifier}/invoke"
  ]

  refresh_token_validity        = 30
  enable_token_revocation       = true
  prevent_user_existence_errors = "ENABLED"
  supported_identity_providers  = ["COGNITO"]
}

# Roles within the single organization (AIV).
locals {
  groups = ["leader", "project_manager", "team_member", "volunteer"]
}

# resource "aws_cognito_user_group" "groups" {
#   for_each     = toset(local.groups)
#   name         = each.value
#   user_pool_id = aws_cognito_user_pool.pool.id
# }
