variable "project_name" { type = string }
variable "environment" { type = string }

variable "lambda_target_arns" {
  type    = map(string)
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
