variable "project_name" { type = string }
variable "environment" { type = string }
variable "api_url" { type = string }
variable "github_owner" { type = string }
variable "github_repo" { type = string }
variable "github_branch" {
  type    = string
  default = "main"
}
variable "enable_amplify" {
  type    = bool
  default = false
}
variable "github_access_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "GitHub personal access token (repo scope) used by Amplify to connect the repository."
}
variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}
variable "user_pool_id" {
  type    = string
  default = ""
}
variable "user_pool_client_id" {
  type    = string
  default = ""
}

locals {
  frontend_env = {
    NEXT_PUBLIC_API_URL             = var.api_url
    NEXT_PUBLIC_ENV                 = var.environment
    NEXT_PUBLIC_AWS_REGION          = var.aws_region
    NEXT_PUBLIC_USER_POOL_ID        = var.user_pool_id
    NEXT_PUBLIC_USER_POOL_CLIENT_ID = var.user_pool_client_id
  }
}

resource "aws_amplify_app" "frontend" {
  count        = var.enable_amplify ? 1 : 0
  name         = "${var.project_name}-${var.environment}-frontend"
  repository   = "https://github.com/${var.github_owner}/${var.github_repo}"
  access_token = var.github_access_token
  description  = "NPO AI Platform Frontend"
  # App uses Next.js static export (output: 'export'), so classic static hosting.
  platform = "WEB"

  environment_variables = local.frontend_env

  build_spec = <<-EOT
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/out
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
  EOT

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_amplify_branch" "main" {
  count       = var.enable_amplify ? 1 : 0
  app_id      = aws_amplify_app.frontend[0].id
  branch_name = var.github_branch

  stage = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  environment_variables = local.frontend_env
}

# Note: Amplify automatically provides a default domain
# (https://<branch>.<app_id>.amplifyapp.com). A custom domain association is only
# needed for your own DNS domain, so it is intentionally omitted here.

output "amplify_app_id" {
  value = var.enable_amplify ? aws_amplify_app.frontend[0].id : ""
}

output "amplify_default_domain" {
  value = var.enable_amplify ? aws_amplify_app.frontend[0].default_domain : ""
}

output "amplify_branch" {
  value = var.enable_amplify ? aws_amplify_branch.main[0].branch_name : ""
}
