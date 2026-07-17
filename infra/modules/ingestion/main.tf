resource "aws_sqs_queue" "ingestion_dlq" {
  name                      = "${var.project_name}-${var.environment}-ingestion-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "ingestion_queue" {
  name                       = "${var.project_name}-${var.environment}-ingestion-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ingestion_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_scheduler_schedule" "sharepoint_sync" {
  name = "${var.project_name}-${var.environment}-sharepoint-sync"
  flexible_time_window { mode = "OFF" }
  schedule_expression = var.schedule_expression_sharepoint
  target {
    arn      = var.sharepoint_lambda_arn
    role_arn = aws_iam_role.scheduler_role.arn
  }
}

resource "aws_iam_role" "scheduler_role" {
  name = "${var.project_name}-${var.environment}-scheduler-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "scheduler.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}
