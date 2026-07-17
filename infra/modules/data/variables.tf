variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "kms_key_arn" {
  type        = string
  description = "ARN of the KMS key for table encryption"
}

variable "enable_pitr" {
  type        = bool
  default     = true
  description = "Enable Point-in-Time Recovery"
}

variable "deletion_protection" {
  type        = bool
  default     = false
  description = "Enable deletion protection (true for prod)"
}

variable "enable_streams" {
  type        = bool
  default     = false
  description = "Enable DynamoDB Streams for change data capture"
}

variable "ttl_attribute" {
  type        = string
  default     = "expires_at"
  description = "Name of the TTL attribute"
}

variable "resource_tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags to apply to all resources"
}

variable "enable_autoscaling" {
  type        = bool
  default     = false
  description = "Enable auto-scaling (for provisioned capacity mode)"
}

variable "read_capacity" {
  type        = number
  default     = 25
  description = "Read capacity units (only used if billing_mode = PROVISIONED)"
}

variable "write_capacity" {
  type        = number
  default     = 25
  description = "Write capacity units (only used if billing_mode = PROVISIONED)"
}
