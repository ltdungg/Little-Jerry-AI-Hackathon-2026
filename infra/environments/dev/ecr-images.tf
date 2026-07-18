# Auto-detect latest image from ECR by tag
# Forces Lambda/AgentCore to update when a new image is pushed with the same tag

data "aws_ecr_image" "api_latest" {
  repository_name = "npo-ai/api"
  image_tag       = "latest"
}

data "aws_ecr_image" "agents_latest" {
  repository_name = "npo-ai/agents"
  image_tag       = "latest"
}

data "aws_ecr_image" "ingestion_latest" {
  repository_name = "npo-ai/ingestion"
  image_tag       = "latest"
}
