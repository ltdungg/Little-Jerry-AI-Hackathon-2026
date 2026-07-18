# NPO AI Platform - Kiến trúc chi tiết

## Tổng quan hệ thống

NPO AI Platform là hệ thống trợ lý AI đa tác vụ cho tổ chức phi lợi nhuận (NPO). Hệ thống sử dụng mô hình **Orchestrator Workflow** - một agent điều phối trung tâm phối hợp nhiều agent chuyên biệt để xử lý câu hỏi tri thức, quản lý dự án/báo cáo, và giao tiếp.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER (Browser)                                 │
│                               │                                        │
│                               ▼                                        │
│                ┌──────────────────────────┐                            │
│                │   Next.js 14 Web App      │  ← Frontend SPA            │
│                │   (React SPA, CSR)        │                            │
│                └───────────┬──────────────┘                            │
│                            │                                            │
│                            ▼                                            │
│                ┌──────────────────────────┐                            │
│                │      AWS Amplify          │  ← Auth SDK + hosting     │
│                │   (Auth, API Client)      │                            │
│                └───────────┬──────────────┘                            │
│                            │ JWT Token (id_token)                      │
│                            ▼                                         │
│                     ┌──────────────────┐                               │
│                     │  AWS Cognito      │  ← Xác thực & phân quyền    │
│                     │  (User Pool)      │                               │
│                     └────────┬─────────┘                               │
│                              │ Verified Claims                         │
│                              ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    API Gateway HTTP API                       │      │
│  │              (Route, Throttle, JWT Authorizer)                │      │
│  └───────────────────────────┬──────────────────────────────────┘      │
│                              │                                         │
│                              ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    API Lambda (Container)                     │      │
│  │    ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │      │
│  │    │ Validate │→ │ Build    │→ │ Create    │→ │ Invoke   │ │      │
│  │    │ Request  │  │ Context  │  │ Workflow  │  │ Agent    │ │      │
│  │    │ (Pydantic)│ │ (Claims) │  │ (DynamoDB)│  │ (Bedrock)│ │      │
│  │    └──────────┘  └──────────┘  └───────────┘  └─────┬────┘ │      │
│  └─────────────────────────────────────────────────────┼───────┘      │
│                                                        │               │
│                    ┌───────────────────────────────────┼──────┐        │
│                    │     Bedrock AgentCore Runtime     │      │        │
│                    │                                   ▼      │        │
│                    │  ┌─────────────────────────────────────┐ │        │
│                    │  │         ORCHESTRATOR AGENT          │ │        │
│                    │  │  ┌───────────┐  ┌──────────────┐   │ │        │
│                    │  │  │  Intent   │  │  Plan        │   │ │        │
│                    │  │  │  Classify │→ │  Decompose   │   │ │        │
│                    │  │  └───────────┘  └──────┬───────┘   │ │        │
│                    │  │                         │           │ │        │
│                    │  │  ┌─────────┐ ┌────────┐ │ ┌───────┐│ │        │
│                    │  │  │ Router  │ │Supervisor│ ││Synth  ││ │        │
│                    │  │  │ (simple)│ │(complex)│ ││Results││ │        │
│                    │  │  └─────────┘ └────┬───┘ │ └───────┘│ │        │
│                    │  └───────────────────┼─────┘──────────┘ │        │
│                    │                      │                   │        │
│                    │     ┌────────────────┼────────────────┐  │        │
│                    │     ▼                ▼                ▼  │        │
│                    │  ┌──────────┐  ┌──────────┐  ┌────────┐ │        │
│                    │  │Knowledge │  │Project & │  │Report/ │ │        │
│                    │  │Agent     │  │Task Agent│  │Comm    │ │        │
│                    │  └────┬─────┘  └────┬─────┘  └───┬────┘ │        │
│                    └───────┼─────────────┼────────────┼──────┘        │
│                            │             │            │                │
│                    ┌───────▼─────────────▼────────────▼──────┐        │
│                    │         AgentCore Gateway                │        │
│                    │    (Tool routing, validation, ACL)       │        │
│                    └───┬────────┬────────┬────────┬──────────┘        │
│                        │        │        │        │                    │
│                        ▼        ▼        ▼        ▼                    │
│                    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐           │
│                    │get_  │ │list_ │ │propose│ │store_    │           │
│                    │project│ │tasks │ │_task  │ │report    │           │
│                    └──────┘ └──────┘ └──────┘ └──────────┘           │
│                                                                       │
│                    ┌──────────────────────────────────────┐            │
│                    │              DATA LAYER               │            │
│                    │  ┌─────────┐  ┌──────────┐  ┌──────┐│            │
│                    │  │DynamoDB │  │    S3    │  │Secrets││            │
│                    │  │(state)  │  │(docs)    │  │Manager││            │
│                    │  └─────────┘  └──────────┘  └──────┘│            │
│                    └──────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. API Gateway HTTP API

### Vai trò
API Gateway là **cổng vào công khai** của hệ thống. Mọi request từ client đều đi qua đây.

### Chức năng
- **Xác thực JWT**: Kiểm tra token Cognito, reject request không có token
- **Route**: Chuyển request đến API Lambda tương ứng
- **Throttle**: Giới hạn 1000 burst, 500 request/giây để bảo vệ hệ thống
- **Access Logging**: Ghi log mọi request vào CloudWatch

### Routes
```
POST   /v1/chat                    → Chat đồng bộ (trả lời ngay)
POST   /v1/workflows               → Tạo workflow bất đồng bộ (202 Accepted)
GET    /v1/workflows/{id}          → Xem trạng thái workflow
POST   /v1/workflows/{id}/confirm  → Xác nhận hành động (gửi Slack, tạo task)
POST   /v1/workflows/{id}/cancel   → Hủy workflow
GET    /v1/reports/{id}            → Xem báo cáo
GET    /health                     → Health check (không cần auth)
```

### Flow xác thực
```
Client → Gửi request với header: Authorization: Bearer <JWT>
     → API Gateway kiểm tra JWT signature bằng Cognito JWKS
     → Nếu hợp lệ: forward request + claims vào Lambda
     → Nếu không hợp lệ: trả 401 Unauthorized
```

---

## 2. AWS Cognito

### Vai trò
**Hệ thống xác thực và quản lý người dùng**. Không có ai trong hệ thống có thể truy cập mà không qua Cognito.

### Cấu trúc
```
User Pool (npo-ai-dev-users)
├── Client (npo-ai-dev-web)
│   └── Auth flows: USER_SRP_AUTH, ALLOW_REFRESH_TOKEN_AUTH
│
├── Groups (vai trò ứng dụng):
│   ├── npo_staff         → Đọc dữ liệu dự án được phép
│   ├── project_manager   → Đọc/ghi dự án, tasks, báo cáo
│   ├── program_director  → Đọc toàn bộ, phê duyệt
│   ├── knowledge_admin   → Quản lý nguồn tri thức
│   ├── platform_admin    → Quản lý hạ tầng (không truy cập data business)
│   └── auditor           → Chỉ đọc audit logs
```

### Flow đăng nhập
```
1. User nhập email + password → Cognito (SRP auth)
2. Cognito trả về: id_token, access_token, refresh_token
3. Client gửi id_token trong header Authorization cho mọi request
4. API Gateway kiểm tra token, extract claims (sub, email, cognito:groups)
5. API Lambda xây dựng RequestContext từ verified claims:
   - tenant_id: từ custom claim hoặc default
   - user_id: từ "sub" claim
   - user_role: map từ cognito:groups
```

### Quan trọng
- **tenant_id KHÔNG BAO GIỜ** đến từ client. Luôn được resolve từ server-side claims.
- **user_role** chỉ được map từ Cognito groups, không tin client-provided roles.

---

## 3. API Lambda (Container Image)

### Vai trò
**Bộ điều phối request** giữa API Gateway và các Agent. Đây là Lambda duy nhất tương tác trực tiếp với client.

### Chức năng chi tiết
```python
# Flow xử lý mỗi request:
1. Parse & validate request body (Pydantic)
   → ChatRequest: { message, project_id?, session_id?, mode, idempotency_key? }

2. Build RequestContext từ Cognito claims
   → RequestContext: { tenant_id, user_id, user_role, session_id, correlation_id }

3. Tạo hoặc load workflow state từ DynamoDB
   → Nếu idempotency_key trùng → trả kết quả cũ (idempotent)
   → Nếu mới → tạo workflow mới với status=queued

4. Xử lý theo mode:
   ├── mode=sync → Invoke Orchestrator ngay, chờ kết quả, trả 200
   └── mode=async → Tạo workflow, invoke Orchestrator background, trả 202

5. Parse structured output từ Orchestrator
   → AgentTaskResult: { status, answer, citations, artifacts, approval }

6. Map lỗi → HTTP responses:
   ├── validation_error → 400
   ├── unauthorized → 403
   ├── not_found → 404
   ├── rate_limited → 429
   └── internal_error → 500
```

### Môi trường
```env
BUSINESS_TABLE=npo-ai-dev-business-data
WORKFLOW_TABLE=npo-ai-dev-workflow-state
RAW_BUCKET=npo-ai-dev-raw
CURATED_BUCKET=npo-ai-dev-curated
ARTIFACT_BUCKET=npo-ai-dev-artifact
REGION=ap-southeast-2
```

---

## 4. Orchestrator Agent

### Vai trò
**Bộ não trung tâm**. Nhận request từ API Lambda, phân loại ý định, lập kế hoạch, gọi các agent chuyên biệt, tổng hợp kết quả.

### Hai chế độ hoạt động

#### Router Mode (đơn giản)
```
User: "What is the procurement policy?"
→ Intent: knowledge_search
→ Route đến Knowledge Agent
→ Trả kết quả trực tiếp
```

#### Supervisor Mode (phức tạp)
```
User: "Create weekly report and draft Slack update"
→ Intent: report_generation + communication
→ Decompose thành DAG:
    ├── Task 1: Knowledge Agent → retrieve meeting notes
    ├── Task 2: Project Task Agent → get overdue tasks (parallel)
    ├── Task 3: Reporting Agent → combine into report (after 1+2)
    └── Task 4: Communication Agent → draft Slack message (after 3)
→ Execute parallel tasks (max 3 concurrent)
→ Synthesize results
→ Return with citations + approval request
```

### Giới hạn (hardcoded)
| Giới hạn | Giá trị | Lý do |
|----------|---------|-------|
| Max plan depth | 2 | Tránh vòng lặp vô hạn |
| Max tasks/workflow | 8 | Giới hạn độ phức tạp |
| Max concurrent calls | 3 | Tránh overload |
| Retry model errors | 1 lần | Lỗi model thường lặp lại |
| Retry transport errors | 2 lần | Network có thể hồi phục |

### Phát hiện kế hoạch lặp
```
Nếu cùng một request tạo ra cùng một plan 2 lần → dừng với error
→ Tránh agent loop vô hạn
```

### Workflow không truy cập data
Orchestrator **KHÔNG** truy cập trực tiếp DynamoDB hay S3. Nó chỉ:
- Đọc/ghi workflow state qua dedicated repository interface
- Gọi specialist agents qua AgentClient

---

## 5. Knowledge Agent

### Vai trò
**Chuyên gia tìm kiếm tri thức**. Tìm kiếm trong các Knowledge Base để trả lời câu hỏi từ tài liệu tổ chức.

### Flow hoạt động
```
1. Nhận request từ Orchestrator
   → { intent: knowledge_search, instructions: "What is the procurement policy?" }

2. Phân tích allowed_sources từ constraints
   → ["drive", "s3"] → cần tra cả 2 KB
   → ["s3"] → chỉ tra KB S3

3. Query Knowledge Bases qua Bedrock API
   → KB-Drive: Google Drive documents
   → KB-S3: SharePoint/Slack normalized content

4. Áp dụng metadata filters (tenant_id, project_ids, allowed_roles)
   → Chỉ lấy document mà user được phép xem

5. Trả kết quả
   ├── Nếu có evidence → AgentTaskResult với citations
   │   citations: [{ source: "sharepoint", title: "Procurement Policy",
   │                  excerpt: "...", uri: "https://..." }]
   └── Nếu không có → status: "completed", summary: "insufficient_evidence"
```

### Bảo mật
- Treat retrieved text as **untrusted data**
- Nếu document chứa prompt injection → ignore instructions trong document
- KHÔNG BAO GIỜ fabricate citation

---

## 6. Project & Task Agent

### Vai trò
**Chuyên gia quản lý dự án**. Truy vấn và cập nhật tasks, milestones, risks.

### Flow đọc (Task Query)
```
1. Nhận: { intent: task_query, instructions: "Show overdue tasks for Green Hope" }
2. Resolve: project_id = "proj-green-hope"
3. Gọi Gateway tool: list_overdue_tasks(tenant_id, project_id)
4. Gateway invoke Lambda → DynamoDB query → trả kết quả
5. Agent tổng hợp: facts + human-readable summary
```

### Flow ghi (Task Write) - Dry Run First
```
1. Nhận: { intent: task_write, instructions: "Assign logistics review to Minh" }
2. Resolve: project_id, assignee, due_date từ instructions
3. Gọi Gateway: propose_task_change(dry_run=true)
   → Lambda trả: { proposed_diff: {...}, confirmation_token: "tok_abc123" }
4. Agent trả về: proposed_action với preview + confirmation_token
5. User confirm → API Lambda gọi commit_task_change(confirmed=true)
6. Lambda ghi vào DynamoDB với idempotency check
```

### Quan trọng
- Agent **KHÔNG** truy cập DynamoDB trực tiếp
- Mọi thao tác đều qua Gateway tools
- Vi phạm: ambiguous assignee/date → clarification request

---

## 7. Reporting Agent

### Vai trò
**Chuyên gia tạo báo cáo**. Tổng hợp dữ liệu từ các agent khác thành báo cáo có cấu trúc.

### Flow
```
1. Nhận outputs từ Orchestrator:
   - Knowledge results (meeting notes, policies)
   - Task results (overdue tasks, milestones)
   - Risk results (open risks)

2. Kết hợp thành báo cáo:
   ├── Weekly Status Report: progress, completed, upcoming
   ├── Risk Summary: risks by severity, mitigation plans
   └── Donor Report: impact metrics, outcomes

3. Store report:
   → Gọi store_report_artifact tool
   → S3: s3://artifact/<tenant>/<workflow_id>/<artifact_id>
   → Metadata → DynamoDB

4. Trả kết quả:
   → artifacts: [{ type: "report", s3_uri: "s3://...", title: "Weekly Report" }]
   → citations: [tất cả citations từ input]
```

---

## 8. Communication Agent

### Vai trò
**Chuyên gia giao tiếp**. Tạo bản nháp Slack/email từ dữ liệu đã xác thực.

### Flow
```
1. Nhận report từ Reporting Agent
2. Tạo bản nháp:
   → channel: #green-hope
   → message: "Weekly Update: 3 tasks completed, 2 overdue..."
3. Gọi create_slack_draft tool
   → Trả: { preview: {...}, confirmation_token: "tok_xyz789" }
4. Trả proposed_action: { type: "send_slack_message", preview, confirmation_token }
5. User confirm → API gọi send_slack_message(confirmed=true)
6. Lambda lấy OAuth token từ Secrets Manager
7. Gửi Slack message qua Slack Web API
8. Ghi external_message_id vào audit log
```

### An toàn
- **Bắt buộc confirm** trong MVP. Không bao giờ gửi without confirmation token.
- Delete, financial, HR, legal actions → **PROHIBITED**.

---

## 9. AgentCore Gateway

### Vai trò
**Lớp điều khiển tool**. Agent không gọi Lambda trực tiếp mà qua Gateway.

### Flow
```
Agent → Gateway Request → Gateway Validation → Lambda Target → Response

Gateway kiểm tra:
1. Agent có quyền gọi tool này không? (allowlist)
2. Input schema có hợp lệ không? (JSON Schema validation)
3. Tenant/Project scope có đúng không?
4. Idempotency key cho mutations
```

### Tool Schemas
```json
// gateway/tool-schemas/get_project.json
{
  "name": "get_project",
  "description": "Retrieve project details by ID",
  "inputSchema": {
    "type": "object",
    "properties": {
      "tenant_id": { "type": "string" },
      "project_id": { "type": "string" }
    },
    "required": ["tenant_id", "project_id"]
  }
}
```

---

## 10. Lambda Tools

### Danh sách 9 tools
| Tool | Chức năng | Mutating? |
|------|----------|-----------|
| `get_project` | Lấy chi tiết dự án | No |
| `list_project_tasks` | Danh sách tasks | No |
| `list_overdue_tasks` | Tasks quá hạn | No |
| `list_project_risks` | Danh sách risks | No |
| `propose_task_change` | Đề xuất thay đổi (dry-run) | No |
| `commit_task_change` | Thực thi thay đổi đã confirm | Yes |
| `store_report_artifact` | Lưu báo cáo vào S3 | Yes |
| `create_slack_draft` | Tạo nháp Slack | No |
| `send_slack_message` | Gửi Slack (cần confirm) | Yes |

### Flow chung của mọi tool Lambda
```
1. Parse Gateway payload (Pydantic validation)
2. Extract tenant_id, project_id từ payload (KHÔNG từ client)
3. Authorization check: user có quyền truy cập tenant/project không?
4. Execute logic:
   ├── Read-only → Query DynamoDB → Return result
   └── Mutating → Check idempotency_key → Write → Return result
5. Return structured envelope:
   {
     "status": "success" | "error",
     "data": {...},
     "error_code": null | "validation_error" | "unauthorized" | ...
   }
```

---

## 11. AgentCore Runtime

### Vai trò
**Nền tảng chạy agent**. Mỗi agent chạy trong container riêng trên AgentCore Runtime.

### Container Contract
```dockerfile
# ARM64 container
EXPOSE 8080
USER appuser  # non-root
HEALTHCHECK CMD curl -f http://localhost:8080/ping

# Endpoints:
GET  /ping          → {"status": "healthy"}
POST /invocations   → AgentTaskRequest → AgentTaskResult
```

### Agent-to-Agent Communication
```
Orchestrator → InvokeAgentRuntime → Knowledge Agent
                                → Project Task Agent
                                → Reporting Agent
                                → Communication Agent

Mỗi invocation:
1. Serialize AgentTaskRequest to JSON
2. POST to agent's /invocations endpoint
3. Deserialize AgentTaskResult
4. Handle errors (retryable?, timeout?)
```

---

## 12. Data Layer

> Chi tiết DynamoDB key patterns, GSI definitions và access patterns: xem [dynamodb.md](dynamodb.md)

### 12.1 DynamoDB Tables

#### BusinessData Table (single-table pattern)
```
Partition key: PK (String)    Sort key: SK (String)
GSI1: User assignment & ownership (tasks by assignee, risks by owner, projects by program)
GSI2: Entity status views (tasks/risks/connectors by status)
TTL: expires_at
```

#### WorkflowState Table
```
Partition key: PK (String)    Sort key: SK (String)
GSI1: Workflow status & pending approvals
TTL: expires_at
```

Key patterns cho từng entity chi tiết tại `docs/dynamodb.md` section 2–3. Python key builders tại `shared/models/keys.py`.

### 12.2 S3 Buckets
```
s3://npo-ai-dev-raw/
  └── <tenant_id>/<source>/<yyyy>/<mm>/<dd>/<source_id>.json

s3://npo-ai-dev-curated/
  └── <tenant_id>/<project_id>/<source>/<document_id>.txt
  └── <tenant_id>/<project_id>/<source>/<document_id>.metadata.json

s3://npo-ai-dev-artifact/
  └── <tenant_id>/<workflow_id>/<artifact_id>
```

### 12.3 Bedrock Knowledge Bases
```
KB-S3: Chứa document SharePoint/Slack đã normalize
  → Vector store: S3 Vectors hoặc OpenSearch Serverless
  → Embedding: amazon.titan-embed-text-v2:0
  → Chunking: FIXED_SIZE (512 tokens, 20% overlap)

KB-Drive: Chứa Google Drive documents (tùy chọn)
  → Toggle by enable_drive_kb variable
```

---

## 13. Ingestion Pipeline

### Flow SharePoint
```
EventBridge (mỗi 6 giờ) → sync_sharepoint Lambda
  → Fetch documents từ Microsoft Graph API (hoặc fixtures)
  → Store raw → s3://raw/<tenant>/sharepoint/<date>/<id>.json
  → Normalize → s3://curated/<tenant>/<project>/sharepoint/<id>.txt
  → Start KB ingestion job (nếu không có job đang chạy)
  → Update checkpoint trong DynamoDB
```

### Flow Slack
```
EventBridge (mỗi 1 giờ) → sync_slack Lambda
  → Fetch messages từ Slack Web API (hoặc fixtures)
  → Normalize threads → coherent documents
  → Store raw + curated
  → Update checkpoint
```

### Checkpoint (chống duplicate)
```
DynamoDB record (BusinessData table):
  PK: TENANT#<tenantId>#CONNECTOR#<connectorId>
  SK: CHECKPOINT#<sourceId>
  → { cursor: "last_message_ts", last_run: "2026-01-15T10:00:00Z" }
  → Mỗi lần sync: chỉ lấy message mới hơn cursor
```

---

## 14. Security Boundaries

### Defense Layers
```
Layer 1: Cognito JWT        → Xác thực user
Layer 2: API Lambda          → Validate claims, build RequestContext
Layer 3: Orchestrator        → Route theo tenant/project ACL
Layer 4: Gateway             → Validate tool permissions
Layer 5: Tool Lambda         → Re-check tenant/project authorization
Layer 6: Knowledge KB        → Metadata filters (tenant, project, role)
```

### Tenant Isolation
```
Mọi query đều bắt đầu bằng tenant_id:
  DynamoDB: PK starts with "TENANT#<tenant_id>"
  S3: prefix = "<tenant_id>/"
  KB: metadata filter = tenant_id
  → User từ tenant A KHÔNG BAO GIỜ thấy data của tenant B
```

### Prompt Injection Defense
```
1. Instructions tách riêng khỏi retrieved content
2. Tool allowlist - agent chỉ gọi được tool được phép
3. Tool parameters constrained by JSON Schema
4. Retrieved text treated as untrusted
5. Confirmation required for side effects
```

---

## 15. Observability

### Correlation ID Flow
```
API Request → correlation_id (UUID)
  → API Lambda → workflow_id
    → Orchestrator → task_id per specialist
      → Agent → tool invocation
        → Lambda → structured log entry

Mọi log entry chứa:
{ correlation_id, workflow_id, task_id, tenant_id, user_id_hash, agent_name, prompt_version }
```

### Metrics Dashboard
```
CloudWatch Dashboard widgets:
1. API: 5xx count, latency (avg, p99)
2. Agents: invocation count, error rate, latency per agent
3. DynamoDB: read/write capacity, throttle count
4. Ingestion: documents processed, lag, quarantined count
5. Model: tokens used, estimated cost
```

---

## 16. Frontend Architecture

### Vai trò
Giao diện web SPA (Single Page Application) sử dụng **Next.js 14 App Router** với client-side rendering, là điểm tương tác duy nhất của người dùng với hệ thống.

### Cấu trúc Route

```
/login                                       → Cognito login form
/dashboard                                   → Redirect đến project list
/dashboard/projects                          → Danh sách projects (KPI cards)
/dashboard/projects/[projectId]              → Project overview (tabs: overview, tasks, risks, knowledge)
/dashboard/projects/[projectId]/tasks        → Task list + create/edit form
/dashboard/projects/[projectId]/risks        → Risk list
/dashboard/projects/[projectId]/knowledge    → Knowledge Q&A assistant
/dashboard/my-tasks                          → Tasks assigned to current user
/dashboard/settings/profile                  → User profile
```

### Authentication Flow
```
1. User truy cập /login → LoginForm component
2. Nhập email + password → aws-amplify signIn()
3. Cognito trả về id_token, access_token, refresh_token
4. AuthContext lưu session → redirect /dashboard
5. API client tự động gắn id_token vào header Authorization
6. ProtectedRoute component kiểm tra session → redirect /login nếu hết hạn
7. Refresh token tự động khi cần (aws-amplify handle)
```

### State Management

| Layer | Công nghệ | Mục đích |
|-------|-----------|----------|
| Server state | TanStack Query | API data, cache, background refetch, optimistic updates |
| App state | React Context (AuthContext, ProjectContext) | User session, selected project |
| Form state | react-hook-form + zod | Form validation, submission |

### Component Hierarchy

```
<RootLayout>
  <Providers>              ← QueryClientProvider + AuthProvider + ProjectProvider + Toaster
    <AppShell>             ← Protected, Sidebar + Header
      <Sidebar>            ← Navigation menu, project selector
      <Header>             ← Breadcrumb, user menu
      <PageContent>        ← Route-specific content

        <!-- WF-01: Knowledge Q&A -->
        <AssistantComposer>   ← Query input + send
        <AssistantAnswer>     ← Streaming answer + citations
          <CitationChips>     ← Clickable citation chips
        <EvidenceDrawer>      ← Slide-over with full evidence
        <WorkflowProgress>    ← Workflow loading state

        <!-- WF-02: Project management -->
        <KpiCards>            ← Summary metrics (tasks, risks, milestones)
        <ProjectOverview>    ← Details + tabs
        <TaskTable>          ← Sortable/filterable task list
        <RiskTable>          ← Risk list by severity

        <!-- WF-03: Task operations -->
        <TaskForm>            ← Create/edit task (react-hook-form + zod)
        <ActionPreviewModal>  ← Dry-run preview + confirm button

        <!-- Shared -->
        <EmptyState>          ← No data placeholder
        <ErrorState>          ← Error boundary display
        <LoadingSkeleton>     ← Skeleton loader
        <ProjectContextSelector> ← Current project dropdown
```

### API Integration (lib/api.ts)
- Tất cả API calls đi qua một module `api.ts` duy nhất
- Tự động gắn Authorization header từ AuthContext
- Error handling tập trung (401 → redirect login, 5xx → toast + retry)
- Response types từ `types.ts` (định nghĩa TypeScript interfaces)

---

## 17. Message Flow Examples

### UC-01: Câu hỏi tri thức
```
User: "What is the procurement policy for Green Hope?"

1. Browser → POST /v1/chat { message: "What is the procurement policy..." }
2. Cognito → verify JWT → claims
3. API Gateway → invoke API Lambda
4. API Lambda:
   - Validate: ChatRequest ✓
   - Build context: { tenant: "tenant-aiv", role: "project_manager" }
   - Create workflow: wf_abc123, status: running
   - Invoke Orchestrator Runtime
5. Orchestrator:
   - Classify intent: knowledge_search
   - Router mode → delegate to Knowledge Agent
   - Invoke Knowledge Agent
6. Knowledge Agent:
   - Query KB-S3 with filter: tenant_id="tenant-aiv", project="green-hope"
   - Found: "Procurement Policy v2.1" (excerpt: "All purchases > $500 require...")
   - Return: { citations: [...], summary: "Two approval steps required..." }
7. Orchestrator → return to API Lambda
8. API Lambda → update workflow status: completed
9. Response → Browser:
   {
     "workflow_id": "wf_abc123",
     "status": "completed",
     "answer": "Two approval steps are required...",
     "citations": [{
       "source_system": "sharepoint",
       "document_title": "Procurement Policy v2.1",
       "excerpt": "All purchases exceeding $500 require...",
       "source_uri": "https://sharepoint.example/policy/123"
     }]
   }
```

### UC-03: Tạo task (với confirmation)
```
User: "Assign logistics review to Minh, deadline Friday"

1. Browser → POST /v1/chat { message: "Assign logistics review..." }
2. → API Lambda → Orchestrator
3. Orchestrator:
   - Intent: task_write
   - Delegate to Project Task Agent
4. Project Task Agent:
   - Resolve: project="green-hope", assignee="user-minh", date="2026-01-17"
   - Call Gateway: propose_task_change(dry_run=true)
5. Gateway → Lambda → proposed diff + confirmation_token
6. Orchestrator → return:
   {
     "status": "waiting_for_user",
     "approval": {
       "action": "create_task",
       "preview": { "title": "Logistics Review", "assignee": "Minh", "due": "2026-01-17" },
       "confirmation_token": "tok_xyz"
     }
   }
7. User clicks "Confirm" → POST /v1/workflows/wf_abc/confirm { confirmation_token: "tok_xyz" }
8. API Lambda → call commit_task_change(confirmed=true)
9. Lambda → DynamoDB PutItem with idempotency check
10. Response: { status: "completed", answer: "Task created successfully" }
```
