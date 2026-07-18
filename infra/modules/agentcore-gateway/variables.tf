variable "project_name" { type = string }
variable "environment" { type = string }

variable "http_targets" {
  type = map(object({
    endpoint_url = string
    secret_arn   = optional(string)
  }))
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
