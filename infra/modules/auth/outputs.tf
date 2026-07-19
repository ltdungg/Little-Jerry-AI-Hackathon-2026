output "user_pool_id" { value = aws_cognito_user_pool.pool.id }
output "user_pool_arn" { value = aws_cognito_user_pool.pool.arn }
output "client_id" { value = aws_cognito_user_pool_client.client.id }
output "user_pool_endpoint" { value = aws_cognito_user_pool.pool.endpoint }

# Gateway MCP credentials (client_credentials flow)
output "gateway_client_id" { value = aws_cognito_user_pool_client.gateway_client.id }
output "gateway_client_secret" { value = aws_cognito_user_pool_client.gateway_client.client_secret }
output "gateway_scope" { value = "${aws_cognito_resource_server.gateway.identifier}/invoke" }
