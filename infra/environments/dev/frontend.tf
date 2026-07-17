# ---------- Frontend (Amplify) ----------
module "frontend" {
  source         = "../../modules/frontend"
  project_name   = var.project_name
  environment    = var.environment
  api_url        = module.api.api_url
  github_owner        = var.github_owner
  github_repo         = var.github_repo
  github_branch       = var.github_branch
  enable_amplify      = var.enable_amplify
  github_access_token = var.github_access_token
  aws_region          = var.aws_region
  user_pool_id        = module.auth.user_pool_id
  user_pool_client_id = module.auth.client_id
}
