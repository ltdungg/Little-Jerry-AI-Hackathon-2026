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
}

resource "aws_cognito_user_pool_client" "client" {
  name                                 = "${var.project_name}-${var.environment}-client"
  user_pool_id                         = aws_cognito_user_pool.pool.id
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

locals {
  groups = ["npo_staff", "project_manager", "program_director", "knowledge_admin", "platform_admin", "auditor"]
}

resource "aws_cognito_user_group" "groups" {
  for_each     = toset(local.groups)
  name         = each.value
  user_pool_id = aws_cognito_user_pool.pool.id
}
