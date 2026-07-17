variable "project_name" { type = string }
variable "environment" { type = string }
variable "sharepoint_lambda_arn" { type = string }
variable "slack_lambda_arn" { type = string }
variable "schedule_expression_sharepoint" {
  type    = string
  default = "rate(6 hours)"
}
variable "schedule_expression_slack" {
  type    = string
  default = "rate(1 hour)"
}
