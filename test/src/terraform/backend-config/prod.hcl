bucket         = "analytics-platform-terraform-state-prod"
key            = "prod/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "analytics-platform-terraform-locks-prod"
