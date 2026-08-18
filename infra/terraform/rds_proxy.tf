resource "aws_iam_role" "rds_proxy_role" {
  name = "devforge-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "rds_proxy_secrets_policy" {
  name = "devforge-rds-proxy-secrets-policy"
  role = aws_iam_role.rds_proxy_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Effect   = "Allow"
        Resource = [aws_secretsmanager_secret.app_secrets.arn]
      }
    ]
  })
}

resource "aws_db_proxy" "devforge_rds_proxy" {
  name                   = "devforge-rds-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy_role.arn
  vpc_subnet_ids         = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  auth {
    auth_scheme = "SECRETS"
    description = "AWS Secrets Manager IAM DB authentication for RDS Proxy"
    iam_auth    = "REQUIRED"
    secret_arn  = aws_secretsmanager_secret.app_secrets.arn
  }

  tags = {
    Name = "DevForge RDS Proxy for IAM Auth & Connection Pooling"
  }
}

resource "aws_db_proxy_default_target_group" "devforge_proxy_tg" {
  db_proxy_name = aws_db_proxy.devforge_rds_proxy.name

  connection_pool_config {
    max_connections_percent      = 100
    max_idle_connections_percent = 50
    connection_borrow_timeout    = 120
  }
}

resource "aws_db_proxy_target" "devforge_proxy_target" {
  db_proxy_name         = aws_db_proxy.devforge_rds_proxy.name
  target_group_name     = aws_db_proxy_default_target_group.devforge_proxy_tg.name
  db_instance_identifier = aws_db_instance.devforge_rds.identifier
}
