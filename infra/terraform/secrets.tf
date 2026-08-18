resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "devforge/prod/secrets"
  description = "AWS Secrets Manager store for DevForge production secrets"

  tags = {
    Name = "devforge-secrets-manager"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets_val" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    JWT_ACCESS_TOKEN_SECRET               = "prod-secret-must-contain-at-least-32-bytes-minimum-length"
    JWT_ISSUER                            = "devforge-api"
    JWT_AUDIENCE                          = "devforge-web"
    JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS  = "900"
    REFRESH_TOKEN_EXPIRES_IN_SECONDS     = "2592000"
  })
}
