project_name = "npo-ai"
environment  = "dev"
aws_region   = "ap-southeast-2"
image_tag = "latest"

embedding_model_id = "amazon.titan-embed-text-v2:0"

enable_drive_kb             = false
enable_s3_kb                = true
enable_sharepoint_ingestion = false
enable_slack_ingestion      = false

log_retention_days = 30

allowed_origins = ["http://localhost:3000", "https://main.ddvf1xez7zo9f.amplifyapp.com"]

# ---- Frontend (Amplify) ----
enable_amplify = true
github_owner   = "ltdungg"
github_repo    = "Little-Jerry-AI-Hackathon-2026"
github_branch  = "main"
# github_access_token is a secret — provide via env: $env:TF_VAR_github_access_token = "<PAT>"

# Amazon Nova via APAC cross-region inference profile (cheap, no Anthropic form,
# on-demand not supported for direct model IDs in ap-southeast-2).
agent_configs = {
  orchestrator    = { model_id = "amazon.nova-pro-v1:0" }
  knowledge       = { model_id = "amazon.nova-pro-v1:0" }
  project_task    = { model_id = "amazon.nova-pro-v1:0" }
  reporting       = { model_id = "amazon.nova-pro-v1:0" }
  communication   = { model_id = "amazon.nova-pro-v1:0" }
  risk_analysis   = { model_id = "amazon.nova-pro-v1:0" }
  alert_manager   = { model_id = "amazon.nova-pro-v1:0" }
  decision_tracker = { model_id = "amazon.nova-pro-v1:0" }
  memory_extraction = { model_id = "amazon.nova-pro-v1:0" }
  backup            = { model_id = "amazon.nova-pro-v1:0" }
}

resource_tags = {
  Project     = "npo-ai"
  Environment = "dev"
  ManagedBy   = "terraform"
}

github_access_token = "dummy_token_to_pass_validation"
