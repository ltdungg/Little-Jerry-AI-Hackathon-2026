variable "project_name" { type = string }
variable "environment" { type = string }
variable "report_lambda_arn" { type = string }
variable "report_lambda_name" { type = string }

variable "schedule_expression" {
  description = "18:00 Asia/Ho_Chi_Minh daily. UTC+7 -> 11:00 UTC. See docs/REPORT-EXPORT-SPEC.md muc 6."
  type        = string
  default     = "cron(0 11 * * ? *)"
}

variable "schedule_timezone" {
  type    = string
  default = "UTC"
}
