variable "project_name" { type = string }
variable "environment" { type = string }
variable "event_expiry_days" {
  type    = number
  default = 30
}
variable "tags" {
  type    = map(string)
  default = {}
}

# ── AgentCore Memory: persistent conversation memory ──
# Stores conversation history that agents can search and add to.
# Scoped per tenant via namespace in the API layer.
resource "awscc_bedrockagentcore_memory" "conversation" {
  name        = "${replace("${var.project_name}-${var.environment}", "-", "_")}_conversation_memory"
  description = "Conversation memory for ${var.project_name} ${var.environment} agents"

  event_expiry_duration = var.event_expiry_days

  tags = var.tags
}

# ── IAM role for memory operations ──
resource "aws_iam_role" "memory" {
  name = "${var.project_name}-${var.environment}-memory-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock-agentcore.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "memory" {
  name = "memory-operations"
  role = aws_iam_role.memory.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "MemoryRecords"
        Effect   = "Allow"
        Action   = [
          "bedrock-agentcore:BatchCreateMemoryRecords",
          "bedrock-agentcore:RetrieveMemoryRecords",
          "bedrock-agentcore:ListMemoryRecords",
          "bedrock-agentcore:GetMemoryRecord",
          "bedrock-agentcore:BatchDeleteMemoryRecords",
          "bedrock-agentcore:BatchUpdateMemoryRecords",
        ]
        Resource = awscc_bedrockagentcore_memory.conversation.memory_arn
      },
      {
        Sid      = "MemoryExtraction"
        Effect   = "Allow"
        Action   = [
          "bedrock-agentcore:StartMemoryExtractionJob",
          "bedrock-agentcore:ListMemoryExtractionJobs",
        ]
        Resource = "*"
      }
    ]
  })
}
