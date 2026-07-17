# ---------- Observability ----------
module "observability" {
  source                       = "../../modules/observability"
  project_name                 = var.project_name
  environment                  = var.environment
  log_retention_days           = var.log_retention_days
  api_gateway_name             = module.api.api_id
  alarm_notification_topic_arn = var.alarm_notification_topic_arn
}
