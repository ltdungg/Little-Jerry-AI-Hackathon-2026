# ============================================================
# BusinessData Table
# Single-table pattern: Tenants, Users, Projects, Tasks, Risks,
# Milestones, Reports, Connectors, Syncs, Source Documents.
# Key design per data-model.md sections 8.2–8.4.
# ============================================================

resource "aws_dynamodb_table" "business_data" {
  name         = "${var.project_name}-${var.environment}-business-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "S"
  }
  attribute {
    name = "GSI2PK"
    type = "S"
  }
  attribute {
    name = "GSI2SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  stream_enabled   = var.enable_streams
  stream_view_type = var.enable_streams ? "NEW_AND_OLD_IMAGES" : null

  deletion_protection_enabled = var.deletion_protection

  # ── GSI1: User assignment and ownership ──
  # Task by assignee:
  #   PK: TENANT#<tenantId>#ASSIGNEE#<userId>
  #   SK: DUE#<yyyy-mm-dd>#STATUS#<status>#PROJECT#<projectId>#TASK#<taskId>
  # Risk by owner:
  #   PK: TENANT#<tenantId>#RISK_OWNER#<userId>
  #   SK: REVIEW#<yyyy-mm-dd>#SEVERITY#<severity>#PROJECT#<projectId>#RISK#<riskId>
  # Project listing by program:
  #   PK: TENANT#<tenantId>#PROGRAM#<programId>
  #   SK: PROJECT#<status>#<projectNameNormalized>#<projectId>
  global_secondary_index {
    name            = "gsi1-user-assignment"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # ── GSI2: Project entity status views ──
  # Task by status:
  #   PK: TENANT#<tenantId>#PROJECT#<projectId>#TASK_STATUS#<status>
  #   SK: DUE#<yyyy-mm-dd>#PRIORITY#<priority>#TASK#<taskId>
  # Risk by status:
  #   PK: TENANT#<tenantId>#PROJECT#<projectId>#RISK_STATUS#<status>
  #   SK: SEVERITY#<severityRank>#REVIEW#<yyyy-mm-dd>#RISK#<riskId>
  # Connector by status:
  #   PK: TENANT#<tenantId>#CONNECTOR_STATUS#<status>
  #   SK: TYPE#<connectorType>#CONNECTOR#<connectorId>
  global_secondary_index {
    name            = "gsi2-entity-status"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  tags = merge(var.resource_tags, {
    Name    = "${var.project_name}-${var.environment}-business-data"
    Table   = "BusinessData"
    Purpose = "Tenants-Users-Projects-Tasks-Risks-Reports-Connectors-Documents"
  })
}

# ============================================================
# WorkflowState Table
# Workflow orchestration: workflows, agent tasks, events,
# approvals, idempotency, projections, sessions.
# Key design per data-model.md sections 9.2–9.5.
# ============================================================

resource "aws_dynamodb_table" "workflow_state" {
  name         = "${var.project_name}-${var.environment}-workflow-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  stream_enabled   = var.enable_streams
  stream_view_type = var.enable_streams ? "NEW_AND_OLD_IMAGES" : null

  deletion_protection_enabled = var.deletion_protection

  # ── GSI1: Operational workflow views ──
  # Workflow by status:
  #   PK: TENANT#<tenantId>#WORKFLOW_STATUS#<status>
  #   SK: UPDATED#<updatedAt>#WORKFLOW#<workflowId>
  # Pending approval by user:
  #   PK: TENANT#<tenantId>#USER#<confirmerUserId>#PENDING_APPROVAL
  #   SK: EXPIRES#<expiresAtPadded>#WORKFLOW#<workflowId>#APPROVAL#<approvalId>
  global_secondary_index {
    name            = "gsi1-workflow-status"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  tags = merge(var.resource_tags, {
    Name    = "${var.project_name}-${var.environment}-workflow-state"
    Table   = "WorkflowState"
    Purpose = "Workflow-orchestration-agent-tasks-events-approvals-idempotency"
  })
}
