variable "project_name" { type = string }
variable "environment" { type = string }
variable "knowledge_base_name" { type = string }
variable "s3_bucket_arn" { type = string }
variable "s3_prefix" {
  type    = string
  default = ""
}
# Kept for interface compatibility. Managed KB uses a service-managed embedding
# model by default, so this is only used when embedding_model_type = CUSTOM.
variable "embedding_model_id" {
  type    = string
  default = "amazon.titan-embed-text-v2:0"
}
# Kept for interface compatibility. Managed KB handles chunking via Smart Parsing.
variable "chunking_strategy" {
  type    = string
  default = "FIXED_SIZE"
}
variable "enable_kb" {
  type    = bool
  default = true
}

data "aws_region" "current" {}

# ── IAM Role for the Managed Knowledge Base ──
# The role name MUST begin with "AmazonBedrockExecutionRoleForKnowledgeBase_"
# (Bedrock validates this prefix when the KB is created).
resource "aws_iam_role" "kb" {
  count = var.enable_kb ? 1 : 0
  name  = "AmazonBedrockExecutionRoleForKnowledgeBase_${var.environment}-${var.knowledge_base_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Project = var.project_name, Environment = var.environment }
}

resource "aws_iam_role_policy" "kb" {
  count = var.enable_kb ? 1 : 0
  name  = "managed-kb-policy"
  role  = aws_iam_role.kb[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadDataSourceBucket"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [var.s3_bucket_arn, "${var.s3_bucket_arn}/*"]
      },
      {
        Sid      = "InvokeEmbeddingModels"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "*"
      }
    ]
  })
}

# ── Bedrock Managed Knowledge Base (via AWS Cloud Control provider) ──
# Fully managed RAG: AWS manages the vector store, indexing and retrieval.
# Billed on-demand (indexed data size + retrievals) — no OpenSearch Serverless
# OCU floor, so no ~$350/month idle cost.
resource "awscc_bedrock_knowledge_base" "this" {
  count    = var.enable_kb ? 1 : 0
  name     = "${var.project_name}-${var.environment}-${var.knowledge_base_name}"
  role_arn = aws_iam_role.kb[0].arn

  knowledge_base_configuration = {
    type = "MANAGED"
    managed_knowledge_base_configuration = {
      # Service-managed embedding model (also enables the managed reranker).
      embedding_model_type = "MANAGED"
    }
  }

  # No storage_configuration: the managed KB provisions and operates its own
  # vector store. This is the key difference from the OpenSearch Serverless path.

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
