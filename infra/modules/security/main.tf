resource "aws_kms_key" "app_data" {
  description         = "NPO AI Platform application data encryption"
  enable_key_rotation = true
}

resource "aws_kms_alias" "app_data" {
  name          = "alias/${var.project_name}/${var.environment}/app-data"
  target_key_id = aws_kms_key.app_data.key_id
}

resource "aws_kms_key" "secrets" {
  description         = "NPO AI Platform secrets encryption"
  enable_key_rotation = true
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}/${var.environment}/secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
