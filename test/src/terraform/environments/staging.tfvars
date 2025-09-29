# Staging Environment Configuration
environment = "staging"
aws_region  = "us-west-2"

# Network Configuration
vpc_cidr           = "10.1.0.0/16"
enable_nat_gateway = true
enable_vpn_gateway = false

# Database Configuration
db_instance_class           = "db.t3.small"
db_allocated_storage        = 50
db_max_allocated_storage    = 200
db_backup_retention_period  = 3
db_multi_az                = false

# Application Configuration
app_cpu           = 512
app_memory        = 1024
app_desired_count = 2
app_min_capacity  = 1
app_max_capacity  = 5

# Redis Configuration
redis_node_type        = "cache.t3.small"
redis_num_cache_nodes  = 1

# Monitoring Configuration
enable_monitoring    = true
log_retention_days   = 14

# Security Configuration
allowed_cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12"]
enable_waf         = true

# Cost Optimization
owner       = "staging-team"
cost_center = "staging"
