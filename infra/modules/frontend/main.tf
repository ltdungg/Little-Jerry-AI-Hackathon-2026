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

resource "aws_amplify_app" "frontend" {
  count       = var.enable_amplify ? 1 : 0
  name        = "${var.project_name}-${var.environment}-frontend"
  repository  = "https://github.com/${var.github_owner}/${var.github_repo}"
  description = "NPO AI Platform Frontend"

  environment_variables = {
    NEXT_PUBLIC_API_URL = var.api_url
    NEXT_PUBLIC_ENV     = var.environment
  }

  build_spec = <<-EOT
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
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

  environment_variables = {
    NEXT_PUBLIC_API_URL = var.api_url
  }
}

resource "aws_amplify_domain_association" "frontend" {
  count       = var.enable_amplify ? 1 : 0
  app_id      = aws_amplify_app.frontend[0].id
  domain_name = "${var.project_name}-${var.environment}.amplifyapp.com"

  sub_domain {
    branch_name = aws_amplify_branch.main[0].branch_name
    prefix      = ""
  }
}

output "amplify_app_id" {
  value = var.enable_amplify ? aws_amplify_app.frontend[0].id : ""
}

output "amplify_default_domain" {
  value = var.enable_amplify ? aws_amplify_app.frontend[0].default_domain : ""
}

output "amplify_branch" {
  value = var.enable_amplify ? aws_amplify_branch.main[0].branch_name : ""
}
