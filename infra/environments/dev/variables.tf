variable "project_name" {
  type    = string
  default = "npo-ai"
}
variable "environment" {
  type    = string
  default = "dev"
}
variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}
variable "image_tag" {
  type    = string
  default = "latest"
}
variable "model_ids_by_agent" {
  type    = map(string)
  default = {}
}
variable "embedding_model_id" {
  type    = string
  default = "amazon.titan-embed-text-v1"
}
variable "vector_store_type" {
  type    = string
  default = "opensearch"
}
variable "enable_drive_kb" {
  type    = bool
  default = true
}
variable "enable_s3_kb" {
  type    = bool
  default = true
}
variable "enable_sharepoint_ingestion" {
  type    = bool
  default = false
}
variable "enable_slack_ingestion" {
  type    = bool
  default = false
}
variable "log_retention_days" {
  type    = number
  default = 30
}
variable "allowed_origins" {
  type    = list(string)
  default = ["*"]
}
variable "alarm_notification_topic_arn" {
  type    = string
  default = ""
}
variable "resource_tags" {
  type    = map(string)
  default = { Project = "npo-ai", ManagedBy = "terraform" }
}

variable "agent_configs" {
  type = map(object({ model_id = string }))
  default = {
    orchestrator    = { model_id = "amazon.nova-lite-v1:0" }
    knowledge       = { model_id = "amazon.nova-lite-v1:0" }
    project_task    = { model_id = "amazon.nova-lite-v1:0" }
    reporting       = { model_id = "amazon.nova-lite-v1:0" }
    communication   = { model_id = "amazon.nova-lite-v1:0" }
  }
  description = "Map of agent name to configuration including model_id"
}

variable "enable_amplify" {
  type    = bool
  default = false
}
variable "github_owner" {
  type    = string
  default = "your-org"
}
variable "github_repo" {
  type    = string
  default = "npo-ai-platform"
}
variable "github_branch" {
  type    = string
  default = "main"
}
variable "github_access_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "GitHub PAT (repo scope) for Amplify to connect the repository. Pass via TF_VAR_github_access_token or -var."
}

# ---------- OAuth Credentials for Jira & Slack MCP ----------
variable "jira_client_id" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Jira OAuth App Client ID"
}

variable "jira_client_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Jira OAuth App Client Secret"
}

variable "slack_client_id" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Slack OAuth App Client ID"
}

variable "slack_client_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Slack OAuth App Client Secret"
}

variable "jira_admin_access_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Jira Admin Access Token (obtained after OAuth flow)"
}

variable "slack_admin_access_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Slack Admin Access Token (obtained after OAuth flow)"
}
