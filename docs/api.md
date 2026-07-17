# NPO AI Platform - API Reference

## Base URL
```
Dev: https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/dev
```

## Authentication
```
Mọi request (trừ /health) cần header:
  Authorization: Bearer <cognito-id-token>

Lấy token:
  aws cognito-idp initiate-auth \
    --client-id <client-id> \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=<user>,PASSWORD=<pass> \
    --region ap-southeast-2
```

---

## POST /v1/chat
Gửi tin nhắn và nhận câu trả lời đồng bộ.

### Request
```json
{
  "message": "What is the procurement policy for Green Hope?",
  "project_id": "proj-green-hope",
  "session_id": "session_001",
  "mode": "sync",
  "idempotency_key": "unique-key-123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | Câu hỏi hoặc yêu cầu |
| project_id | string | No | ID dự án (để filter kết quả) |
| session_id | string | No | Session ID (tạo mới nếu không có) |
| mode | string | No | sync (default) hoặc async |
| idempotency_key | string | No | Key để chống duplicate |

### Response (200 OK)
```json
{
  "workflow_id": "wf_a1b2c3d4",
  "status": "completed",
  "answer": "The procurement policy requires two approval steps for purchases over $500...",
  "citations": [
    {
      "citation_id": "cit_001",
      "source_system": "sharepoint",
      "document_id": "doc-procurement-001",
      "document_title": "Procurement Policy v2.1",
      "source_uri": "https://sharepoint.example/policies/procurement",
      "page_or_section": "Section 4.2",
      "excerpt": "All purchases exceeding $500 require...",
      "last_modified_at": "2026-01-10T00:00:00Z"
    }
  ],
  "artifacts": [],
  "approval": null
}
```

### Response - Cần xác nhận (200 OK)
```json
{
  "workflow_id": "wf_a1b2c3d4",
  "status": "waiting_for_user",
  "answer": "I've prepared the task update. Please confirm:",
  "citations": [],
  "artifacts": [],
  "approval": {
    "approval_id": "approval_001",
    "action": "create_task",
    "preview": {
      "project_id": "proj-green-hope",
      "title": "Logistics Review",
      "assignee": "Minh",
      "due_date": "2026-01-17"
    },
    "expires_at": "2026-01-15T10:15:00Z"
  }
}
```

---

## POST /v1/workflows
Tạo workflow bất đồng bộ cho task phức tạp.

### Request
```json
{
  "message": "Create the weekly Green Hope report and draft a Slack update.",
  "project_id": "proj-green-hope",
  "mode": "async",
  "idempotency_key": "wf-unique-456"
}
```

### Response (202 Accepted)
```json
{
  "workflow_id": "wf_e5f6g7h8",
  "status": "queued",
  "answer": "Workflow started. Check status at GET /v1/workflows/wf_e5f6g7h8",
  "citations": [],
  "artifacts": [],
  "approval": null
}
```

---

## GET /v1/workflows/{workflow_id}
Xem trạng thái workflow.

### Response (200 OK)
```json
{
  "workflow_id": "wf_e5f6g7h8",
  "status": "completed",
  "answer": "Weekly report created and Slack draft prepared.",
  "citations": [
    {
      "citation_id": "cit_002",
      "source_system": "s3",
      "document_id": "meeting-2026-01-13",
      "document_title": "Team Meeting Notes Jan 13",
      "source_uri": "s3://curated/tenant-aiv/proj-green-hope/s3/meeting-2026-01-13.txt",
      "excerpt": "Discussed Q1 milestones..."
    }
  ],
  "artifacts": [
    {
      "artifact_id": "art_001",
      "artifact_type": "report",
      "title": "Green Hope Weekly Report - Jan 13",
      "s3_uri": "s3://artifact/tenant-aiv/wf_e5f6g7h8/art_001",
      "created_at": "2026-01-15T10:05:00Z"
    }
  ],
  "approval": null
}
```

---

## POST /v1/workflows/{workflow_id}/confirm
Xác nhận hành động (tạo task, gửi Slack).

### Request
```json
{
  "confirmation_token": "tok_xyz789"
}
```

### Response (200 OK)
```json
{
  "workflow_id": "wf_a1b2c3d4",
  "status": "completed",
  "answer": "Task created and assigned to Minh successfully.",
  "citations": [],
  "artifacts": [],
  "approval": null
}
```

### Error (400 Bad Request)
```json
{
  "error_code": "validation_error",
  "message": "Invalid or expired confirmation token"
}
```

---

## POST /v1/workflows/{workflow_id}/cancel
Hủy workflow.

### Response (200 OK)
```json
{
  "workflow_id": "wf_a1b2c3d4",
  "status": "cancelled"
}
```

---

## GET /v1/reports/{report_id}
Xem báo cáo đã tạo.

### Response (200 OK)
```json
{
  "report_id": "art_001",
  "title": "Green Hope Weekly Report - Jan 13",
  "report_type": "weekly_status",
  "content": "# Weekly Report\n\n## Summary\n3 tasks completed, 2 overdue...",
  "s3_uri": "s3://artifact/tenant-aiv/wf_e5f6g7h8/art_001",
  "citations": [...],
  "created_at": "2026-01-15T10:05:00Z"
}
```

---

## GET /health
Health check endpoint. Không cần authentication.

### Response (200 OK)
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-15T10:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error_code": "validation_error",
  "message": "Invalid request body",
  "details": {
    "field_errors": [
      {"field": "message", "error": "Field required"}
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "error_code": "unauthorized",
  "message": "Missing or invalid authentication token"
}
```

### 403 Forbidden
```json
{
  "error_code": "unauthorized",
  "message": "You do not have access to this resource"
}
```

### 404 Not Found
```json
{
  "error_code": "not_found",
  "message": "Workflow not found"
}
```

### 429 Rate Limited
```json
{
  "error_code": "rate_limited",
  "message": "Too many requests. Please retry after 30 seconds."
}
```

### 500 Internal Error
```json
{
  "error_code": "internal_error",
  "message": "An unexpected error occurred. Please contact support."
}
```

---

## curl Examples

### Chat (knowledge question)
```bash
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id <client-id> \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=testuser,PASSWORD=MyPassword123! \
  --query 'AuthenticationResult.IdToken' --output text \
  --region ap-southeast-2)

curl -X POST https://<api-url>/v1/chat \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the procurement policy?",
    "project_id": "proj-green-hope",
    "mode": "sync"
  }'
```

### Create async workflow
```bash
curl -X POST https://<api-url>/v1/workflows \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create weekly report and draft Slack update",
    "project_id": "proj-green-hope",
    "mode": "async"
  }'
```

### Check workflow status
```bash
curl https://<api-url>/v1/workflows/wf_a1b2c3d4 \
  -H "Authorization: Bearer ${TOKEN}"
```

### Confirm action
```bash
curl -X POST https://<api-url>/v1/workflows/wf_a1b2c3d4/confirm \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"confirmation_token": "tok_xyz789"}'
```

---

## Idempotency
```
Gửi cùng idempotency_key → trả kết quả lần đầu (không tạo lại)
- Áp dụng cho: POST /v1/chat, POST /v1/workflows
- Key hết hạn sau: 24 giờ
- Lưu trong DynamoDB WorkflowState table
```

## Rate Limits
```
API Gateway throttle:
- Burst: 1000 requests
- Sustained: 500 requests/second

Per-IP throttling có thể cấu hình thêm trong Terraform.
```
