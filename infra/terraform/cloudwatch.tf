resource "aws_cloudwatch_log_group" "rds_postgres_log_group" {
  name              = "/aws/rds/instance/devforge-prod-db/postgresql"
  retention_in_days = 30

  tags = {
    Name = "DevForge RDS PostgreSQL CloudWatch Log Group"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "devforge-rds-high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm triggered when RDS PostgreSQL CPU utilization exceeds 80% for 10 minutes"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.devforge_rds.identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_low_free_storage" {
  alarm_name          = "devforge-rds-low-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  alarm_description   = "Alarm triggered when RDS PostgreSQL free storage drops below 5 GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.devforge_rds.identifier
  }
}
