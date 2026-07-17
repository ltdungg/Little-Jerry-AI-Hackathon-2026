variable "project_name" { type = string }
variable "environment" { type = string }
variable "api_lambda_arn" { type = string }
variable "api_lambda_name" { type = string }
variable "cognito_user_pool_id" { type = string }
variable "cognito_client_id" { type = string }
variable "allowed_origins" { type = list(string) }
variable "aws_region" { type = string }
