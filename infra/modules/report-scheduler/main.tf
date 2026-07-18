# EventBridge Scheduler that triggers lambdas/scheduled/generate_daily_reports.py
# every day at 18:00 Asia/Ho_Chi_Minh. That single invocation always creates a
# "daily" report per active project and, if the day matches
# WEEKLY_REPORT_WEEKDAY (Lambda env var, default Chu nhat), also creates a
# "weekly" report for the same projects — see docs/REPORT-EXPORT-SPEC.md muc 6.
resource "aws_scheduler_schedule" "daily_reports" {
  name = "${var.project_name}-${var.environment}-daily-reports"
  flexible_time_window { mode = "OFF" }
  schedule_expression          = var.schedule_expression
  schedule_expression_timezone = var.schedule_timezone
  target {
    arn      = var.report_lambda_arn
    role_arn = aws_iam_role.report_scheduler_role.arn
  }
}

resource "aws_iam_role" "report_scheduler_role" {
  name = "${var.project_name}-${var.environment}-report-scheduler"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "scheduler.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "report_scheduler_invoke" {
  name = "invoke-report-lambda"
  role = aws_iam_role.report_scheduler_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = var.report_lambda_arn
    }]
  })
}
