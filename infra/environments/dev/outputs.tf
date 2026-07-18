output "gateway_client_id" {
  value = module.gateway.cognito_client_id
}
output "gateway_client_secret" {
  value = module.gateway.cognito_client_secret
  sensitive = true
}
output "gateway_user_pool_id" {
  value = module.gateway.cognito_user_pool_id
}
output "gateway_url" {
  value = module.gateway.gateway_url
}
output "cognito_domain" {
  value = module.gateway.cognito_domain
}
