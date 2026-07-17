variable "project_name" { type = string }
variable "environment" { type = string }
variable "agent_configs" {
  type = map(object({
    ecr_image_uri      = string
    execution_role_arn = string
    model_id           = string
  }))
  description = "Map of agent name to its configuration"
}
variable "tags" {
  type    = map(string)
  default = {}
}

# ── AgentCore Runtime per agent (AWS Cloud Control provider) ──
# Serverless hosting for the agent containers. Billed per CPU/memory-second only
# while a session is active; idle runtimes incur no compute charge.
resource "awscc_bedrockagentcore_runtime" "agent" {
  for_each = var.agent_configs

  # Runtime name must match ^[a-zA-Z][a-zA-Z0-9_]{0,47}$ (no hyphens).
  agent_runtime_name = replace("${var.project_name}_${var.environment}_${each.key}", "-", "_")
  description        = "AgentCore runtime for the ${each.key} agent"
  role_arn           = each.value.execution_role_arn

  agent_runtime_artifact = {
    container_configuration = {
      container_uri = each.value.ecr_image_uri
    }
  }

  network_configuration = {
    network_mode = "PUBLIC"
  }

  environment_variables = {
    AGENT_NAME       = each.key
    BEDROCK_MODEL_ID = each.value.model_id
  }

  tags = var.tags
}
