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
    VITE_API_URL             = var.api_url
    VITE_AWS_REGION          = var.aws_region
    VITE_USER_POOL_ID        = var.user_pool_id
    VITE_USER_POOL_CLIENT_ID = var.user_pool_client_id
    # Required for monorepo: Amplify must know the app root directory.
    # TODO: rename frontend-reactjs → frontend then change this back to "frontend"
    AMPLIFY_MONOREPO_APP_ROOT = "frontend-reactjs"
  }
}

resource "aws_amplify_app" "frontend" {
  count        = var.enable_amplify ? 1 : 0
  name         = "${var.project_name}-${var.environment}-frontend"
  repository   = "https://github.com/${var.github_owner}/${var.github_repo}"
  access_token = var.github_access_token
  description  = "NPO AI Platform Frontend (React + Vite)"
  # Vite SPA — no server-side rendering needed, use static hosting.
  platform = "WEB"

  # SPA routing rule: rewrite 404 to index.html
  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  environment_variables = local.frontend_env

  # Monorepo build spec for Vite: app lives under frontend-reactjs/ (appRoot).
  # TODO: rename frontend-reactjs → frontend then change appRoot back to "frontend"
  build_spec = <<-EOT
version: 1
applications:
  - appRoot: frontend-reactjs
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

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
