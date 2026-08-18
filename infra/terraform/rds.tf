resource "aws_db_parameter_group" "rds_pg" {
  name   = "devforge-rds-pg-16"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "devforge_rds" {
  identifier                          = "devforge-prod-db"
  engine                              = "postgres"
  engine_version                      = "16.1"
  instance_class                      = "db.t4g.micro"
  allocated_storage                   = 20
  max_allocated_storage               = 100
  storage_type                        = "gp3"
  storage_encrypted                   = true
  publicly_accessible                 = false
  iam_database_authentication_enabled = true
  db_subnet_group_name                = aws_db_subnet_group.rds.name
  vpc_security_group_ids              = [aws_security_group.db_sg.id]
  parameter_group_name                = aws_db_parameter_group.rds_pg.name
  db_name                             = "devforge"
  username                            = "devforge_app_user"
  skip_final_snapshot                 = true

  tags = {
    Name = "DevForge Private AWS RDS PostgreSQL"
  }
}
