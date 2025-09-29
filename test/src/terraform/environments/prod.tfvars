# Production Environment Configuration
environment = "prod"
aws_region  = "us-west-2"

# Network Configuration
vpc_cidr           = "10.2.0.0/16"
enable_nat_gateway = true
enable_vpn_gateway = true

# Database Configuration
db_instance_class           = "db.r6g.large"
db_allocated_storage        = 100
db_max_allocated_storage    = 1000
db_backup_retention_period  = 30
db_multi_az                = true

# Application Configuration
app_cpu           = 1024
app_memory        = 2048
app_desired_count = 3
app_min_capacity  = 2
app_max_capacity  = 20

# Redis Configuration
redis_node_type        = "cache.r6g.large"
redis_num_cache_nodes  = 2

# Monitoring Configuration
enable_monitoring    = true
log_retention_days   = 90

# Security Configuration
allowed_cidr_blocks = ["10.0.0.0/8"]
enable_waf         = true

# Cost Optimization
owner       = "platform-team"
cost_center = "production"
