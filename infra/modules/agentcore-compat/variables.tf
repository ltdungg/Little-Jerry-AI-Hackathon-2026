variable "project_name" { type = string }
variable "environment" { type = string }
variable "enable_workaround" {
  type    = bool
  default = false
}
variable "workaround_commands" {
  type    = list(string)
  default = []
}
