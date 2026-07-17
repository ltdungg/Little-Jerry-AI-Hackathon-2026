project_name = "npo-ai"
environment  = "dev"
aws_region   = "ap-southeast-2"
image_tag    = "latest"

embedding_model_id = "amazon.titan-embed-text-v2:0"

enable_drive_kb             = false
enable_s3_kb                = true
enable_sharepoint_ingestion = false
enable_slack_ingestion      = false

log_retention_days = 30

allowed_origins = ["http://localhost:3000"]

# Amazon Nova via APAC cross-region inference profile (cheap, no Anthropic form,
# on-demand not supported for direct model IDs in ap-southeast-2).
agent_configs = {
  orchestrator  = { model_id = "apac.amazon.nova-lite-v1:0" }
  knowledge     = { model_id = "apac.amazon.nova-lite-v1:0" }
  project_task  = { model_id = "apac.amazon.nova-lite-v1:0" }
  reporting     = { model_id = "apac.amazon.nova-lite-v1:0" }
  communication = { model_id = "apac.amazon.nova-lite-v1:0" }
}

resource_tags = {
  Project     = "npo-ai"
  Environment = "dev"
  ManagedBy   = "terraform"
}
