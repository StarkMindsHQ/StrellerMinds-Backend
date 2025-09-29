bucket         = "analytics-platform-terraform-state-dev"
key            = "dev/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "analytics-platform-terraform-locks-dev"
