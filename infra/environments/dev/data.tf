# ---------- Data: DynamoDB Tables ----------
module "data" {
  source              = "../../modules/data"
  project_name        = var.project_name
  environment         = var.environment
  kms_key_arn         = module.security.kms_app_arn
  enable_pitr         = true
  deletion_protection = false
  enable_streams      = false
  resource_tags       = var.resource_tags
}
