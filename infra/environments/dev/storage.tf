# ---------- Storage: S3 Buckets ----------
module "storage" {
  source                     = "../../modules/storage"
  project_name               = var.project_name
  environment                = var.environment
  enable_deletion_protection = false
}
