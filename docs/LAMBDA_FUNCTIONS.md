# Lambda Functions

## Tổng Quan

Tất cả Lambda functions được đóng gói trong Docker images chạy trên ARM64.

## Danh Sách Lambda

### 1. API Lambda (`lambdas/api/handler.py`)
- **Handler:** `lambdas.api.handler.lambda_handler`
- **Chức năng:** REST API chính, xử lý **80+ routes** — Projects, Tasks, Risks, Reports, Chat, Teams, Users, Meetings, Documents, Handoffs, Roles, Onboarding, Activity Log, OAuth
- **Đặc điểm:** Route matching bằng compiled regex, `_record_activity()` audit log, view mappers cho mỗi entity, PDF export qua WeasyPrint

### 2. Tools Lambda (`lambdas/tools/handler.py`)
- **Handler:** `lambdas.tools.handler.lambda_handler`
- **Chức năng:** Unified router cho 9 MCP Gateway tools
- **Tools:** `get_project`, `list_project_tasks`, `list_overdue_tasks`, `list_project_risks`, `propose_task_change`, `commit_task_change`, `create_slack_draft`, `send_slack_message`, `store_report_artifact`
- **Đặc điểm:** Mỗi tool là module riêng, propose/commit pattern (dry-run + confirmation token)

### 3. Slack Receiver Lambda (`lambdas/slack_receiver/handler.py`)
- **Handler:** `receiver.lambda_handler`
- **Chức năng:** Nhận sự kiện Slack (app_mention, message)
- **Đặc điểm:** Xác thực chữ ký HMAC-SHA256, trả lời challenge verification, invoke Orchestrator Agent, gửi response qua Slack API

### 4. Jira Webhook Lambda (`lambdas/jira_webhook/handler.py`)
- **Handler:** `lambdas.jira_webhook.handler.lambda_handler`
- **Chức năng:** Xử lý webhook từ Jira (issue created/updated/deleted)
- **Đặc điểm:** Cập nhật aggregated metrics DynamoDB, phát hiện overdue tasks, priority escalation, gửi Slack notification

### 5. Scheduled Reports Lambda (`lambdas/scheduled/generate_daily_reports.py`)
- **Handler:** `generate_daily_reports.lambda_handler`
- **Chức năng:** Tạo báo cáo tự động theo lịch
- **Đặc điểm:** Cron `0 11 * * ? *` UTC (18:00 VN daily), tạo daily report cho mọi active project, thêm weekly report vào Chủ nhật, idempotency guard

### 6. Ingestion Lambdas (`lambdas/ingestion/`)
- **start_kb_ingestion.py:** Bắt đầu ingestion job lên Bedrock Knowledge Base, concurrency guard (409 Conflict nếu job đang chạy)
- **sync_sharepoint.py:** Đồng bộ tài liệu từ SharePoint (fixture mode hoặc Graph API)
- **sync_slack.py:** Đồng bộ tin nhắn Slack (fixture mode hoặc Slack Web API)
- **normalize_document.py:** S3-triggered Lambda — normalize document JSON, tính SHA256 hash, lưu vào curated bucket

### 7. Common Utilities (`lambdas/common/`)
- **utils.py:** `parse_body()`, `build_response()`, `build_error_response()`, `extract_claims()` (Cognito JWT), `build_request_context()` (tenant_id, user_id, role từ Cognito groups)
- **pdf_renderer.py:** Chuyển Markdown → HTML → PDF qua WeasyPrint, có header/footer styling

## Dockerfile

- Base image: `public.ecr.aws/lambda/python:3.12`
- System deps: pango, cairo-gobject, gdk-pixbuf2 (cho WeasyPrint)
- Copy uv từ `ghcr.io/astral-sh/uv:0.5.11`
- Copy source: `lambdas/`, `agents/common/`, `shared/`, `fixtures/`
- Default CMD: `lambdas.api.handler.lambda_handler`
