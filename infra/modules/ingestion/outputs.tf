output "queue_url" { value = aws_sqs_queue.ingestion_queue.url }
output "queue_arn" { value = aws_sqs_queue.ingestion_queue.arn }
output "dlq_url" { value = aws_sqs_queue.ingestion_dlq.url }
output "schedule_arns" {
  value = {
    sharepoint = aws_scheduler_schedule.sharepoint_sync.arn
  }
}
