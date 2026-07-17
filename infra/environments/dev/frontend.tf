# ---------- Frontend (Amplify) ----------
module "frontend" {
  source         = "../../modules/frontend"
  project_name   = var.project_name
  environment    = var.environment
  api_url        = module.api.api_url
  github_owner   = var.github_owner
  github_repo    = var.github_repo
  github_branch  = var.github_branch
  enable_amplify = var.enable_amplify
}
