module "gateway" {
  source              = "../../modules/gateway"
  gateway_name        = "${var.project_name}-${var.environment}-gateway-v7"
  runtime_name        = var.project_name
  environment         = var.environment
  schemas_bucket_name = "${var.project_name}-${var.environment}-gateway-schemas-v4-${data.aws_caller_identity.current.account_id}"
}
