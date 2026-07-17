# ---------- Knowledge Bases ----------
module "bedrock_kb" {
  source              = "../../modules/bedrock-kb"
  project_name        = var.project_name
  environment         = var.environment
  knowledge_base_name = "s3-curated"
  s3_bucket_arn       = module.storage.curated_bucket_arn
  s3_prefix           = ""
  embedding_model_id  = var.embedding_model_id
  chunking_strategy   = "FIXED_SIZE"
  enable_kb           = var.enable_s3_kb
}

module "bedrock_kb_drive" {
  source              = "../../modules/bedrock-kb"
  project_name        = var.project_name
  environment         = var.environment
  knowledge_base_name = "drive"
  s3_bucket_arn       = module.storage.raw_bucket_arn
  s3_prefix           = "drive/"
  embedding_model_id  = var.embedding_model_id
  chunking_strategy   = "FIXED_SIZE"
  enable_kb           = var.enable_drive_kb
}
