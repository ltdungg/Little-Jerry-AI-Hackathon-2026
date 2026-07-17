resource "aws_cloudwatch_log_group" "logs" {
  for_each          = toset(["api", "orchestrator-agent", "knowledge-agent", "project-task-agent", "reporting-agent", "communication-agent"])
  name              = "/aws/lambda/${var.project_name}-${var.environment}-${each.value}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      { type = "metric", x = 0, y = 0, width = 12, height = 6, properties = { metrics = [["AWS/ApiGateway", "5XXError", "ApiName", var.api_gateway_name]], region = "us-east-1", title = "API 5xx Errors" } }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_actions       = var.alarm_notification_topic_arn != "" ? [var.alarm_notification_topic_arn] : []
}
