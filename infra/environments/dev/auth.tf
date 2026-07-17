# ---------- Auth: Cognito ----------
module "auth" {
  source        = "../../modules/auth"
  project_name  = var.project_name
  environment   = var.environment
  callback_urls = var.allowed_origins
  logout_urls   = var.allowed_origins
}
