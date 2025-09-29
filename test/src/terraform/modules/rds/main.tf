# Random password for database
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Secrets Manager secret for database credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${local.name_prefix}-db-credentials"
  description             = "Database credentials for ${local.name_prefix}"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "postgres"
    password = random_password.db_password.result
  })
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${local.name_prefix}-db-params"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  tags = local.common_tags
}

# RDS Instance
module "rds" {
  source = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name_prefix}-postgres"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "analytics_platform"
  username = "postgres"
  manage_master_user_password = false
  password = random_password.db_password.result
  port     = 5432

  multi_az               = var.db_multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  maintenance_window              = "Mon:00:00-Mon:03:00"
  backup_window                   = "03:00-06:00"
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  create_cloudwatch_log_group     = true

  backup_retention_period = var.db_backup_retention_period
  skip_final_snapshot     = var.environment != "prod"
  deletion_protection     = var.environment == "prod"

  performance_insights_enabled          = var.environment == "prod"
  performance_insights_retention_period = var.environment == "prod" ? 7 : null

  create_monitoring_role = true
  monitoring_interval    = 60

  parameter_group_name = aws_db_parameter_group.main.name

  tags = local.common_tags
}
