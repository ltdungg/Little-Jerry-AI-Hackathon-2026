terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    awscc = {
      source  = "hashicorp/awscc"
      version = ">= 1.90"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = merge(var.resource_tags, {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    })
  }
}

# AWS Cloud Control provider — used for newer resources like the
# Bedrock Managed Knowledge Base that the classic aws provider doesn't cover yet.
provider "awscc" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
