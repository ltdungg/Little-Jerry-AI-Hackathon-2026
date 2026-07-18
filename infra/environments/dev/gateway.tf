# ---------- Secrets for OAuth App Config ----------
resource "aws_secretsmanager_secret" "jira_client_id" {
  name = "${var.project_name}-${var.environment}-jira-client-id"
}

resource "aws_secretsmanager_secret" "jira_client_secret" {
  name = "${var.project_name}-${var.environment}-jira-client-secret"
}

resource "aws_secretsmanager_secret" "slack_client_id" {
  name = "${var.project_name}-${var.environment}-slack-client-id"
}

resource "aws_secretsmanager_secret" "slack_client_secret" {
  name = "${var.project_name}-${var.environment}-slack-client-secret"
}

# (Optional) Store the active admin access token globally
resource "aws_secretsmanager_secret" "jira_admin_access_token" {
  name = "${var.project_name}-${var.environment}-jira-admin-access-token"
}
resource "aws_secretsmanager_secret" "slack_admin_access_token" {
  name = "${var.project_name}-${var.environment}-slack-admin-access-token"
}

# ---------- AgentCore Gateway ----------
module "agentcore_gateway" {
  source       = "../../modules/agentcore-gateway"
  project_name = var.project_name
  environment  = var.environment
  tags         = var.resource_tags
  
  http_targets = {
    "jira" = {
      endpoint_url = "https://mcp.atlassian.com/v1/mcp/authv2"
    },
    "slack" = {
      endpoint_url = "https://mcp.slack.com/v1"
    }
  }
}
