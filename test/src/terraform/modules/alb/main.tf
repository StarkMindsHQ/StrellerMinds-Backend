# Application Load Balancer
module "alb" {
  source = "terraform-aws-modules/alb/aws"
  version = "~> 8.0"

  name = "${local.name_prefix}-alb"

  load_balancer_type = "application"

  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.public_subnets
  security_groups = [aws_security_group.alb.id]

  access_logs = {
    bucket  = aws_s3_bucket.alb_logs.bucket
    enabled = true
  }

  target_groups = [
    {
      name             = "${local.name_prefix}-tg"
      backend_protocol = "HTTP"
      backend_port     = var.app_port
      target_type      = "ip"
      
      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
    }
  ]

  https_listeners = [
    {
      port               = 443
      protocol           = "HTTPS"
      certificate_arn    = aws_acm_certificate_validation.main.certificate_arn
      target_group_index = 0
    }
  ]

  http_tcp_listeners = [
    {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  ]

  tags = local.common_tags
}

# S3 Bucket for ALB Access Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${local.name_prefix}-alb-logs-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "prod"

  tags = local.common_tags
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_elb_service_account.main.id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      }
    ]
  })
}

data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "delete_old_logs"
    status = "Enabled"

    expiration {
      days = var.environment == "prod" ? 90 : 30
    }
  }
}
