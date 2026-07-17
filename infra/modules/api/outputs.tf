output "api_url" { value = aws_apigatewayv2_api.api.api_endpoint }
output "api_id" { value = aws_apigatewayv2_api.api.id }
output "authorizer_id" { value = aws_apigatewayv2_authorizer.auth.id }
