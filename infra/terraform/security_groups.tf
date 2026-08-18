resource "aws_security_group" "app_sg" {
  name        = "devforge-app-sg"
  description = "Security group for DevForge API server tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "devforge-app-sg"
  }
}

resource "aws_security_group" "db_sg" {
  name        = "devforge-rds-db-sg"
  description = "Isolated Security Group for AWS RDS PostgreSQL (No Public Access)"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "devforge-rds-db-sg"
  }
}
