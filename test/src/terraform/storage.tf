# S3 Bucket for Application Storage
resource "aws_s3_bucket" "app_storage" {
  bucket        = "${local.name_prefix}-app-storage-${random_id.storage_suffix.hex}"
  force_destroy = var.environment != "prod"

  tags = local.common_tags
}

resource "random_id" "storage_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Database URL Secret (constructed from RDS outputs)
resource "aws_secretsmanager_secret" "db_url" {
  name                    = "${local.name_prefix}-db-url"
  description             = "Database URL for ${local.name_prefix}"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://postgres:${random_password.db_password.result}@${module.rds.db_instance_endpoint}:${module.rds.db_instance_port}/analytics_platform"
}
