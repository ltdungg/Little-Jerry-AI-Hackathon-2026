terraform {
  backend "s3" {
    bucket  = "npo-ai-dev-tfstate"
    key     = "dev/terraform.tfstate"
    region  = "ap-southeast-2"
    encrypt = true
  }
}
