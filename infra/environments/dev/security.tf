# ---------- Security: KMS Keys ----------
module "security" {
  source       = "../../modules/security"
  project_name = var.project_name
  environment  = var.environment
}
