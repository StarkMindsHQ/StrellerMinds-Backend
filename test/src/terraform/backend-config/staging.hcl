bucket         = "analytics-platform-terraform-state-staging"
key            = "staging/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "analytics-platform-terraform-locks-staging"
