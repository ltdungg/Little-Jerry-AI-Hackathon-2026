# MCP Gateway

## Tổng Quan

Amazon Bedrock AgentCore Gateway cung cấp giao thức **MCP (Model Context Protocol)** để AI agents gọi các công cụ bên ngoài (Jira, Slack) qua HTTP.

## Gateway Configuration

- **Tên:** `npo-ai-dev-gateway-v7`
- **Protocol:** MCP (versions: 2025-03-26, 2025-06-18, 2025-11-25)
- **Search Type:** Semantic
- **Authorizer:** Custom JWT (Cognito OpenID Connect)

## Gateway Targets

### 1. Jira
- **Type:** Atlassian
- **Auth:** OAuth2 client_credentials
- **Cognito Client Secret:** Lưu trong Secrets Manager
- **Schemas:** `gateway/tool-schemas/jira-open-api.json`

### 2. Slack
- **Type:** Custom
- **Endpoint:** `https://slack.com/api`
- **Auth:** Bearer token (từ Secrets Manager)

## Tool Schemas (9 tools)

Mỗi tool có JSON schema: `name`, `description`, `inputSchema` (properties + required).

### Jira Tools (6 tools)

| Tool | Mô Tả | Required Params | Optional Params |
|------|-------|----------------|-----------------|
| `get_project` | Lấy chi tiết project | tenant_id, project_id | — |
| `list_project_tasks` | Liệt kê tasks dự án | tenant_id, project_id | status_filter |
| `list_overdue_tasks` | Liệt kê tasks quá hạn | tenant_id | project_id |
| `list_project_risks` | Liệt kê rủi ro dự án | tenant_id, project_id | severity_filter |
| `propose_task_change` | Đề xuất thay đổi task (dry-run, trả confirmation_token) | tenant_id, project_id, title | — |
| `commit_task_change` | Xác nhận thay đổi task | tenant_id, confirmation_token, idempotency_key | — |

### Slack Tools (2 tools)

| Tool | Mô Tả | Required Params |
|------|-------|----------------|
| `create_slack_draft` | Tạo bản nháp tin nhắn Slack | tenant_id, channel, message |
| `send_slack_message` | Gửi tin nhắn Slack | tenant_id, confirmation_token, idempotency_key |

### Report Tool (1 tool)

| Tool | Mô Tả | Required Params | Optional Params |
|------|-------|----------------|-----------------|
| `store_report_artifact` | Lưu báo cáo (S3 + DynamoDB) | tenant_id, workflow_id, report_type, content | project_id, report_id, category |

## Propose/Commit Pattern

Một số tool (propose_task_change, commit_task_change, create_slack_draft, send_slack_message) sử dụng mô hình 2 bước:

1. **Propose:** Tạo draft + confirmation_token (idempotent, an toàn để gọi lại)
2. **Commit:** Xác nhận bằng confirmation_token + idempotency_key (thực thi thật)

Mô hình này đảm bảo an toàn cho các thay đổi có ảnh hưởng.

## Dynamic Tool Discovery

Agents (đặc biệt Project Task Agent) tự động fetch tool definitions từ Gateway khi khởi động:
1. Kết nối đến MCP Gateway URL
2. Liệt kê available tools
3. Lọc theo target name (Jira/Slack)
4. Wrap mỗi tool thành `PythonAgentTool` cho Strands Agent framework
