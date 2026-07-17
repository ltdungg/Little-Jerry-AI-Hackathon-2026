variable "project_name" { type = string }
variable "environment" { type = string }
variable "enable_deletion_protection" {
  type    = bool
  default = false
}
