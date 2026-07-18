# Bảo Mật

## Tổng Quan

Bảo mật nhiều lớp: xác thực, phân quyền, mã hóa, quản lý secrets, input validation.

## 1. Xác Thức (Authentication)

| Thành Phần | Phương Thức | Chi Tiết |
|-----------|------------|---------|
| Người dùng | Cognito JWT | User Pool + Access Token, Bearer header |
| Jira MCP | OAuth2 | client_credentials flow qua Cognito |
| Slack Bot | Bot Token + Signing Secret | HMAC-SHA256 verification |
| AgentCore | IAM Roles | Per-agent execution roles |
| Terraform | IAM User/Role | AWS credentials qua GitHub Secrets |

## 2. Phân Quyền (RBAC)

**11 Capabilities:**
`KNOWLEDGE_READ`, `PROJECT_READ`, `TASK_READ`, `TASK_WRITE`, `STATUS_WRITE`, `REPORT_READ`, `REPORT_CREATE`, `COMM_DRAFT`, `COMM_SEND`, `APPROVE`, `WORKFLOW_MANAGE`

**4 Roles:**

| Role | Capabilities |
|------|-------------|
| Leader | Tất cả 11 capabilities |
| Project Manager | Tất cả trừ COMM_SEND, WORKFLOW_MANAGE |
| Team Member | KNOWLEDGE_READ, PROJECT_READ, TASK_READ/WRITE, STATUS_WRITE, REPORT_READ/CREATE |
| Volunteer | KNOWLEDGE_READ, PROJECT_READ, TASK_READ, STATUS_WRITE |

Role mặc định khi không xác định: **volunteer** (least privilege).

## 3. Mã Hóa (Encryption)

| Loại | Phương Thức | Phạm Vi |
|------|------------|--------|
| At rest | AES-256 | S3 buckets, ECR images, DynamoDB |
| In transit | TLS 1.2+ | API Gateway, Lambda, HTTPS endpoints |
| Secrets | AWS Secrets Manager | Jira tokens, Slack tokens, signing secrets |
| KMS | AWS KMS | Decrypt operations cho agents |

## 4. Quản Lý Secrets

Tất cả secrets lưu trong AWS Secrets Manager:
- `npo-ai-jira-client-secret` — Jira OAuth client secret
- `npo-ai-slack-bot-token` — Slack bot token
- `npo-ai-slack-signing-secret` — Slack signing secret cho webhook verification

Agents truy cập secrets qua IAM role riêng, token cache 5 phút trước khi hết hạn.

## 5. Input Validation

- **Pydantic models:** Validate tất cả request/response tại mỗi endpoint
- **Route matching:** Compiled regex patterns cho URL routing
- **Request context:** Extract và validate Cognito claims

## 6. Webhook Security

- **Slack:** HMAC-SHA256 signature verification với tolerance 5 phút
- **Jira:** Webhook endpoint riêng, IP filtering (tùy cấu hình)

## 7. OWASP Top 10 Protection

| Lỗ Hổng | Biện Pháp |
|----------|----------|
| Injection (SQL/NoSQL) | DynamoDB NoSQL + parameterized queries |
| XSS | React auto-escaping |
| Broken Auth | Cognito JWT + RBAC |
| Sensitive Data Exposure | Secrets Manager + encryption at rest/transit |
| XML External Entities | Không sử dụng XML parsing |
| Security Misconfiguration | Terraform IaC,least privilege IAM |
| Insecure Deserialization | Pydantic validation |
| Insufficient Logging | CloudWatch Logs + activity audit trail |

## 8. Network Security

- **Lambda VPC:** Lambda functions chạy trong VPC private
- **API Gateway:** TLS termination, throttling
- **Security Groups:** Agent isolation
- **No public S3:** Tất cả S3 buckets private

## 9. Audit & Compliance

- **Activity Log:** Ghi lại mọi thay đổi dữ liệu (user, action, entity, timestamp, IP)
- **Agent Memory:** 30-day retention cho conversation history
- **DynamoDB:** Point-in-time recovery enabled
- **CloudWatch:** Structured logging cho tất cả Lambda functions

## 10. Dependency Security

- **pip-audit:** Kiểm tra lỗ hổng dependencies (trong CI)
- **Trivy:** Container image scanning
- **tfsec:** Terraform security scanning
- **Dependabot:** Auto-update dependencies (tùy cấu hình)
