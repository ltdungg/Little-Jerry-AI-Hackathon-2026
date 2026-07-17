variable "project_name" { type = string }
variable "environment" { type = string }
variable "image_tag_mutability" {
  type    = string
  default = "IMMUTABLE"
}

locals {
  repo_names = ["agents", "api", "tools", "ingestion"]
}

resource "aws_ecr_repository" "repos" {
  for_each             = toset(local.repo_names)
  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = var.environment == "dev" ? "MUTABLE" : var.image_tag_mutability
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
  tags = { Project = var.project_name, Environment = var.environment }
}

resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = toset(local.repo_names)
  repository = aws_ecr_repository.repos[each.value].name
  policy = jsonencode({
    rules = [
      { rulePriority = 1, description = "Remove untagged", selection = { tagStatus = "untagged", countType = "imageCountMoreThan", countNumber = 10 }, action = { type = "expire" } },
      { rulePriority = 2, description = "Keep max 20", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }, action = { type = "expire" } }
    ]
  })
}
