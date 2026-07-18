# NPO AI Platform - Bảo mật

## 1. Xác thực (Authentication)

### AWS Cognito User Pool
```
User Pool: npo-ai-dev-users
Client: npo-ai-dev-web (không có client secret)
Auth flow: SRP (Secure Remote Password)
Password policy: 12+ ký tự, uppercase + lowercase + number + symbol
MFA: Optional (bật cho production)
```

### Flow xác thực
```
1. Client → Cognito: initiate_auth(EMAIL, PASSWORD)
2. Cognito → Client: id_token (JWT, expires 1hr), access_token, refresh_token
3. Client → API: Authorization: Bearer <id_token>
4. API Gateway → verify JWT signature bằng Cognito JWKS endpoint
5. API Gateway → forward request + decoded claims vào Lambda
```

### JWT Claims được tin
```json
{
  "sub": "uuid-cognito-user-id",          // ← user_id (server-side, không thể giả mạo)
  "cognito:groups": "project_manager",     // ← user_role (map server-side)
  "custom:tenant_id": "tenant-aiv",        // ← tenant_id (custom claim)
  "email": "user@example.com"
}
```

**Quan trọng**: tenant_id và user_role LUÔN được resolve từ verified claims, không bao giờ từ client input.

---

## 2. Phân quyền (Authorization)

### Vai trò và quyền hạn
```
┌─────────────────────┬───────────────────────────────────────────┐
│ Vai trò              │ Quyền hạn                                │
├─────────────────────┼───────────────────────────────────────────┤
│ npo_staff            │ Đọc dự án được phân công                 │
│ project_manager      │ Đọc/ghi tasks, risks, reports (1 project)│
│ program_director     │ Đọc toàn bộ projects, phê duyệt         │
│ knowledge_admin      │ Quản lý Knowledge Bases, ingestion       │
│ platform_admin       │ Quản lý hạ tầng AWS                     │
│ auditor              │ Chỉ đọc audit logs                       │
└─────────────────────┴───────────────────────────────────────────┘
```

### Tenant Isolation
```
Mọi query DynamoDB đều bắt đầu bằng partition key:
  PK = "TENANT#<tenant_id>#PROJECT#<project_id>"

→ User từ tenant "tenant-aiv" KHÔng thể query data của "tenant-xyz"
→ Kiểm tra ở 3 lớp:
  1. RequestContext (API Lambda)
  2. Gateway validation
  3. Tool Lambda re-check
```

### Project-level ACL
```
user_id → allowed_projects: ["proj-green-hope", "proj-ocean-rescue"]
  → Nếu project_id không trong allowed_projects → 403 Forbidden
```

---

## 3. Mã hóa (Encryption)

### At Rest
```
DynamoDB:  AWS-owned KMS key (default)
           + Customer-managed KMS key (npo-ai-dev-app-data)
S3:        AES256 (SSE-S3) cho tất cả buckets
Secrets:   AWS-managed KMS key
Logs:      CloudWatch Logs encryption
```

### In Transit
```
API Gateway:    TLS 1.2+ (bắt buộc)
S3:             tls: false → Deny (bucket policy)
AgentCore:      TLS 1.2+ cho mọi runtime communication
DynamoDB:       TLS 1.2+ (AWS default)
```

---

## 4. Quản lý bí mật (Secrets Management)

### AWS Secrets Manager
```
Secrets được lưu trữ:
├── npo-ai-dev/microsoft-graph
│   └── { client_id, client_secret, tenant_id }
├── npo-ai-dev/slack-oauth
│   └── { bot_token, app_token, signing_secret }
└── npo-ai-dev/google-drive
    └── { service_account_key }

Runtime flow:
1. Lambda → secretsmanager:GetSecretValue
2. Cache in memory (max 5 phút)
3. KHÔNG BAO GIỜ log secrets
4. KHÔNG BAO GIỜ store secrets trong DynamoDB/S3
```

### Rules
- Không store secrets trong source code, environment variables, hoặc logs
- Secrets chỉ được retrieve tại runtime từ Secrets Manager
- Secrets cache tối đa 5 phút rồi refresh
- Rotation tự động qua AWS Secrets Manager rotation

---

## 5. Prompt Injection Defense

### Các lớp bảo vệ
```
1. Instruction Isolation
   → System prompts tách riêng khỏi retrieved content
   → Agent instructions ở layer trên, retrieved text ở layer dưới

2. Tool Allowlist
   → Agent chỉ gọi được tool được phép
   → Không có tool "任意代码执行" hoặc "AWS API call"

3. Tool Parameter Constraints
   → JSON Schema validation cho mỗi tool
   → Không cho model generate DynamoDB expressions, SQL, IAM policies

4. Retrieved Text as Untrusted
   → Knowledge Agent treat mọi retrieved text là untrusted
   → Ignore instructions found trong documents

5. Confirmation Required
   → Mọi write operation cần user confirm
   → Slack send LUÔN cần confirm trong MVP

6. Output Validation
   → Validate citations thực sự tồn tại
   → Không expose presigned S3 URL除非 authorized và short-lived
```

---

## 6. Audit Logging

### CloudTrail
```
Ghi lại mọi API call đến AWS services:
- DynamoDB writes
- S3 puts
- Lambda invocations
- Secrets Manager access
- Bedrock model invocations
```

### Application Audit
```
Mọi workflow event được ghi:
{
  "event_type": "intent_classified" | "agent_selected" | "tool_requested" | "approval_required",
  "workflow_id": "wf_abc",
  "user_id_hash": "sha256(user_id)",  // KHÔNG log raw user_id
  "action": "...",
  "result": "...",
  "timestamp": "2026-01-15T10:00:00Z"
}
```

### Redaction Rules
```
KHÔNG log:
- Access tokens, OAuth codes, cookies
- Authorization headers
- Document bodies (full content)
- Secrets values
- Chain-of-thought reasoning
- Model hidden reasoning
```

---

## 7. IAM Least Privilege

### Agent Execution Role
```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
  "Resource": "arn:aws:bedrock:*::foundation-model/amazon.*"
}
// Chỉ invoke được model được cấu hình, không phải mọi model
```

### API Lambda Role
```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"],
  "Resource": ["arn:aws:dynamodb:*:table/npo-ai-dev-business-data", "...workflow-state"]
  // Chỉ truy cập 2 tables cụ thể
}
```

### Tool Lambda Roles
```
Mỗi tool Lambda có role riêng:
- get_project:     chỉ dynamodb:GetItem
- propose_task:    chỉ dynamodb:PutItem (với条件 checks)
- commit_task:     dynamodb:PutItem + ConditionalCheckFailed exception handling
- store_report:    s3:PutObject on artifact bucket only
- send_slack:      secretsmanager:GetSecretValue + HTTPS outbound only
```

### Prohibited Policies
```
KHÔNG BAO GIỜ attach:
- AdministratorAccess
- AmazonBedrockFullAccess
- BedrockAgentCoreFullAccess
- * (wildcard)
```

---

## 8. Network Security

### MVP (Public Mode)
```
AgentCore Runtime: Public network mode
  → Đơn giản, không cần VPC endpoints
  → Phù hợp cho MVP và development

API Gateway: Internet-facing
  → CORS configured cho allowed_origins
  → Throttle protection
```

### Production (VPC Mode - Optional)
```
Khi enable_vpc_mode = true:
- AgentCore Runtime chạy trong private subnets
- Cần VPC endpoints cho: S3, DynamoDB, ECR, Secrets Manager, Bedrock
- Security groups cho inter-service communication
- NAT Gateway cho outbound internet (Slack API, Microsoft Graph)
```

---

## 9. Container Security

### Agent Containers
```
- Chạy với non-root user (appuser:1000)
- Multi-stage Docker build (reduced attack surface)
- No secrets baked into image
- SIGTERM handling for graceful shutdown
- Health checks (/ping endpoint)
- JSON structured logging (no sensitive data)
```

### Lambda Containers
```
- AWS Lambda Python 3.12 base image
- Read-only root filesystem
- /tmp only for bounded temporary files
- No unnecessary packages installed
```

### Vulnerability Scanning
```
ECR: scan_on_push = true
CI/CD: trivy container scan trong pipeline
Dependency: pip-audit trong CI
```

---

## 10. Compliance Considerations

### Data Classification
```
Public:     Health endpoint, public documentation
Internal:   Project metadata, task titles, team structure
Confidential: Document content, meeting notes, financial data
Restricted:  User PII, OAuth tokens, API keys
```

### Retention
```
DynamoDB: PITR enabled (point-in-time recovery)
S3: Lifecycle policies (raw 365 days, artifacts indefinite)
CloudWatch Logs: 30 days (configurable)
Audit events: Indefinite in DynamoDB
```

### Deletion Protection
```
- DynamoDB: deletion_protection_enabled = true (production)
- S3: Block Public Access enabled, versioning enabled
- KMS: key deletion window = 30 days
```
