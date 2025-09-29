# Development Environment Configuration
environment = "dev"
aws_region  = "us-west-2"

# Network Configuration
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true
enable_vpn_gateway = false

# Database Configuration
db_instance_class           = "db.t3.micro"
db_allocated_storage        = 20
db_max_allocated_storage    = 100
db_backup_retention_period  = 1
db_multi_az                = false

# Application Configuration
app_cpu           = 256
app_memory        = 512
app_desired_count = 1
app_min_capacity  = 1
app_max_capacity  = 3

# Redis Configuration
redis_node_type        = "cache.t3.micro"
redis_num_cache_nodes  = 1

# Monitoring Configuration
enable_monitoring    = true
log_retention_days   = 7

# Security Configuration
allowed_cidr_blocks = ["0.0.0.0/0"]
enable_waf         = false

# Cost Optimization
owner       = "dev-team"
cost_center = "development"
