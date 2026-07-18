# NPO AI Platform

**Nen tang AI da tac tu (Multi-Agent AI Platform) danh cho to chuc phi loi nhuan (NPO) tai Viet Nam**

NPO AI Platform la he thong AI agent tu dong hoa toan dien hoat dong quan ly du an, truyen thong noi bo, bao cao, va ra quyet dinh cho cac to chuc phi loi nhuan. He thong duoc xay tren nen tang AWS, tich hop Jira, Slack, va Bedrock Knowledge Base thong qua giao thuc MCP (Model Context Protocol).

---

## Muc luc

- [Tong quan](#tong-quan)
- [Kien truc he thong](#kien-truc-he-thong)
- [Cac Agent chuc nang](#cac-agent-chuc-nang)
- [Cong nghe su dung](#cong-nghe-su-dung)
- [Cau truc thu muc](#cau-truc-thu-muc)
- [API Reference](#api-reference)
- [Frontend](#frontend)
- [Trien khai](#trien-khai)
- [Cau hinh moi truong](#cau-hinh-moi-truong)
- [Quan ly du lieu](#quan-ly-du-lieu)
- [Bao mat](#bao-mat)
- [Van hanh & Giam sat](#van-hanh--giam-sat)
- [Testing](#testing)
- [Tai lieu](#tai-lieu)

---

## Tong quan

### Van de can giai quyet

Cac to chuc phi loi nhuan (NPO) tai Viet Nam doi mat voi nhieu thach thuc:

- **Thong tin phan tan**: Du lieu phan tan tren nhieu he thong (Jira, Slack, Google Drive, SharePoint) khong co noi dung chung
- **Thieu tu dong hoa**: Bao cao, tong hop tien do, phan tich rui ro deu lam thu cong, ton nhieu thoi gian
- **Mat nguon tri thuc**: Quyet dinh quan trong bi mat khi nguoi di, nguoi den khong biet chinh sach, quy trinh nao
- **Thieu bao cao thuc te**: Lanh dao khong co tong quan real-time ve tinh hinh tat ca chuong trinh
- **Truyen thong noi bo kem**: Gui tin nhan Slack, tao bao cao, thong bao deu lam thu cong

### Giai phap

NPO AI Platform su dung he thong **7 AI Agent chuyen biet** ket hop thanh mot **Orchestrator** trung tam de:

1. **Hoi noi bo** - Tra loi cau hoi ve chinh sach, quy trinh tu Knowledge Base voi citation
2. **Quan ly task** - Truy van, tao, cap nhat task tren Jira thong qua MCP
3. **Lien lac** - Gui tin nhan Slack, soạn thao email tu dong
4. **Bao cao** - Tao bao cao ngay/tuan/tien do/chi dinh tu du lieu thuc te
5. **Phan tich rui ro** - Phat hien task qua han, rui ro chua giam thieu, milestone tre han
6. **Trich xuat tri thuc** - Trich xuat quyet dinh, action items, blockers tu cuoc hop
7. **Memory** - Luu tru cau trao doi, tri thuc to chuc

---

## Kien truc he thong

### Luong xu ly request

```
User → Next.js Web App → Cognito Auth → API Gateway → API Lambda → Orchestrator Runtime (LangGraph)
                                                                           │
                                                                           ├── Project Task Agent (MCP → Jira)
                                                                           ├── Knowledge Agent (RAG → Bedrock KB)
                                                                           ├── Reporting Agent (DynamoDB → Markdown/PDF)
                                                                           ├── Communication Agent (MCP → Slack)
                                                                           ├── Risk Analysis Agent (DynamoDB)
                                                                           └── Memory Extraction Agent (AgentCore Memory)
                                                                                │
                                                                                └── Synthesizer → Response to User
```

### Kien truc tong the

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                         │
│              AWS Amplify · Responsive · Dark Mode               │
│   Dashboard | Chat AI | Tasks | Reports | Risks | Teams | ...  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (REST API)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (REST)                           │
│              Amazon API Gateway + Cognito JWT Auth              │
│   /v1/chat  /v1/projects  /v1/reports  /v1/teams  /v1/me/...  │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────────┐
│    API LAMBDA       │    │       TOOLS LAMBDA                │
│    (REST Handlers)  │    │   (MCP Gateway Tool Executor)     │
│    512MB · 30s      │    │   256MB · 30s                     │
└──────────┬──────────┘    └──────────┬───────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AWS BEDROCK AGENTCORE                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Orchestrator │  │  AgentCore   │  │  AgentCore Gateway   │  │
│  │  Runtime      │  │  Memory      │  │  (MCP Protocol)      │  │
│  │  (LangGraph)  │  │  (30 days)   │  │  JWT Auth → Cognito  │  │
│  └──────┬───────┘  └──────────────┘  └──────┬───────────────┘  │
│         │                                    │                  │
│  ┌──────▼────────────────────────────────────▼───────────────┐  │
│  │              SPECIALIZED AGENT RUNTIMES                   │  │
│  │                                                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Project  │ │Knowledge │ │Reporting │ │   Risk   │    │  │
│  │  │  Task    │ │          │ │          │ │ Analysis │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐                               │  │
│  │  │Communi-  │ │ Memory   │                               │  │
│  │  │ cation   │ │Extraction│                               │  │
│  │  └──────────┘ └──────────┘                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐
│   AMAZON     │  │  BEDROCK     │  │  EXTERNAL SERVICES    │
│   BEDROCK    │  │  KNOWLEDGE   │  │                       │
│   (LLM)      │  │  BASE        │  │  ┌─────┐  ┌────────┐ │
│   Nova Lite  │  │  (RAG)       │  │  │Jira │  │ Slack  │ │
│   via Nova   │  │  + OpenSearch│  │  │ API │  │  API   │ │
│              │  │  + Titan Emb │  │  └──┬──┘  └───┬────┘ │
└──────────────┘  └──────────────┘  └─────┼────────┼───────┘
                                          │        │
                                   ┌──────▼────────▼──────┐
                                   │   MCP Gateway        │
                                   │   (AgentCore)        │
                                   │   Semantic Search    │
                                   └─────────────────────┘
```

### Luu tru du lieu

```
┌─────────────────────────────────────────────────────────────┐
│                    DYNAMODB (Single Table)                   │
│                                                             │
│  PK: TENANT#aiv              SK: PROJECT#proj-green-hope   │
│  PK: TENANT#aiv#PROJECT#...  SK: TASK#task-001             │
│  PK: TENANT#aiv#PROJECT#...  SK: RISK#risk-001             │
│  PK: TENANT#aiv#PROJECT#...  SK: MILESTONE#ms-001          │
│  PK: TENANT#aiv#PROJECT#...  SK: REPORT#2026-01-15#rpt-001 │
│  PK: TENANT#aiv#USER#...     SK: SESSION#sess-001          │
│  PK: TENANT#aiv#TEAM#...     SK: REPORT#W03-2026           │
│  PK: TENANT#aiv              SK: ACTIVITY#...               │
│  PK: TENANT#aiv              SK: ROLE_PERMISSIONS           │
│                                                             │
│  + KMS CMK Encryption | PITR Enabled | TTL                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       S3 STORAGE                            │
│                                                             │
│  Raw Bucket:       Nguon goc tu SharePoint/Google Drive     │
│  Curated Bucket:   Documents da xu ly, chunk, embed         │
│  Artifact Bucket:  Reports (Markdown + PDF), exports        │
└─────────────────────────────────────────────────────────────┘
```

---

## Cac Agent chuc nang

### 1. Orchestrator Agent (Dieu phoi trung tam)

**Cong nghe**: LangGraph StateGraph + ReAct Pattern + Map-Reduce + Reflection

Orchestrator la trung tam tim cua he thong. Khi nguoi dung gui cau hoi, duoc xu ly theo flow:

```
Planner → Execute Workers (parallel) → Verifier → (retry if missing) → Synthesizer
```

| Buoc | Mo ta |
|------|-------|
| **Planner** | Phan tich cau hoi, xac dinh agent nao can goi, tao plan JSON voi chi thi cu the |
| **Execute Workers** | Chay song song (asyncio.gather) cac agent con theo plan, moi agent chay rieng biet |
| **Verifier** | Kiem tra du lieu day du, phat hien mau thuan giua cac nguon; tra ve MISSING/OK |
| **Synthesizer** | Tong hop ket qua thanh cau tra loi Markdown, dung tieng Viet, co emoji khi phu hop |

**Dac diem ky thuat**:
- **Retry logic**: Neu Verifier phat hien thieu thong tin, quay lai Planner toi da 2 lan (tranh vong lap vo han)
- **Memory**: Luu/history conversation vao Bedrock AgentCore Memory (giu 30 ngay, namespace theo session)
- **Role-based**: Phan biet leader, project_manager, team_member, volunteer
- **Error handling**: Moi sub-agent duoc try-catch rieng, khong anh huong agent khac

### 2. Project Task Agent (Quan ly task)

**Cong nghe**: Strands Agent + MCP Tools (Jira via AgentCore Gateway)

Ket noi truc tiep voi Jira thong qua AgentCore Gateway MCP:
- `SearchIssues` - Tim kiem theo JQL
- `GetAllBoards` - Liệt kê boards
- `createIssue` - Tao task moi
- `addComment` - Them binh luan
- `DoTransition` - Doi trang thai

**Luu y quan trong**: Khong bao gio bia du lieu. Chi tra loi dua tren ket qua tra ve tu Jira MCP.

### 3. Knowledge Agent (Tri thuc to chuc)

**Cong nghe**: Strands Agent + Bedrock Knowledge Base (RAG)

- `search_organizational_knowledge` - Retrieve & Generate (RAG full: tim + tao cau tra loi)
- `search_documents` - Vector search chi muc do (tra ve chunks lien quan)

Ket noi voi Bedrock Knowledge Base, su dung Amazon Titan Embeddings de tim kiem semantic. Moi cau tra loi di kem citation (nguon tai lieu, doan trich, phan chua).

### 4. Reporting Agent (Bao cao)

**Cong nghe**: Strands Agent + DynamoDB + S3

Loai bao cao ho tro:
| Loai | Mo ta |
|------|-------|
| `daily_status` | Chi thay doi trong 24h qua (task updates, issues, risks) |
| `weekly_status` | Tong quan task, rui ro, milestone |
| `risk_summary` | Phan tich chi tiet tung rui ro theo muc do |
| `progress_summary` | Theo doi tien do thuc hien, so sanh milestone |

- Tao bao cao Markdown, luu vao S3 Artifact Bucket
- Export PDF (WeasyPrint) voi format chuyen nghiep
- **Khong dung LLM de tao noi dung bao cao** - du lieu 100% tu DynamoDB, deterministic

### 5. Communication Agent (Lien lac)

**Cong nghe**: Strands Agent + MCP Tools (Slack via AgentCore Gateway)

- Gui tin nhan Slack thong qua AgentCore Gateway
- Soạn thao draft email
- **Khong tu bia du lieu** - chi gui tin nhan khi co cong cu MCP thuc su

### 6. Risk Analysis Agent (Phan tich rui ro)

**Cong nghe**: Strands Agent + DynamoDB (BusinessDataClient)

Cac chuc nang chinh:
- `analyze_task_overdue_patterns` - Phat hien mau task qua han, thanh vien bi qua tai
- `analyze_risk_trends` - Phan tich xu huong rui ro (critical, high, chua giam thieu)
- `detect_dependency_risks` - Phat hien task bi chan, milestone qua han, ty le hoan thanh thap
- `generate_proactive_alerts` - Tong hop canh bao chu dong, sap xep theo muc do uu tien

**Logic canh bao chi tiet**:
| Dieu kien | Muc do | Hanh dong de xuat |
|-----------|--------|-------------------|
| Thanh vien co 3+ task qua han | `high` | Kiem tra workload, phan lai task |
| Task qua han binh thuong | `medium` | Lien he nguoi phu trach |
| Task KHAN CAP qua han | `critical` | Dieu phoi nhan su xu ly ngay |
| 3+ rui ro CAO dong thoi | `high` | To chuc hop danh gia toan dien |
| Rui ro chua co giai phap | `medium` | Phan bo chu so huu, xac dinh giai phap |
| Milestone qua han | `critical` | Danh gia lai timeline, thong bao stakeholder |
| Ty le hoan thanh < 30% | `high` | Xem lai phan bo nguon luc |

### 7. Memory Extraction Agent (Trich xuat tri thuc)

**Cong nghe**: Strands Agent + Bedrock AgentCore Memory

Trich xuat tu cuoc hop:
- **Quyet dinh** (decisions) - Noi dung, ly do, nguoi lien quan, muc do chac chan
- **Action items** - Cong viec, nguoi phu trach, han chot, muc uu tien
- **Blockers** - Van de, tac dong, giai phap de xuat

Luu vao Institutional Memory de to chuc **khong mat tri thuc khi nguoi di**.

---

## Cong nghe su dung

### Backend

| Cong nghe | Phien ban | Cong dung |
|-----------|-----------|-----------|
| Python | 3.12+ | Ngon ngu chinh |
| FastAPI / aiohttp | - | API server (Lambda container) |
| LangGraph | 1.2.9+ | Orchestrator workflow graph |
| Strands Agents | Latest | AI Agent framework (Bedrock-native) |
| Amazon Bedrock | - | LLM (Nova Lite) + Knowledge Base (RAG) |
| Amazon AgentCore | - | Agent runtime + memory + MCP gateway |
| DynamoDB | - | Business data store (single-table design) |
| S3 | - | Document & artifact storage |
| WeasyPrint | - | PDF report generation |
| structlog | - | Structured logging |
| Pydantic v2 | - | Data validation & contracts |

### Frontend

| Cong nghe | Mo ta |
|-----------|-------|
| Next.js 14 | App Router, server/client components |
| React 18 | Functional components, hooks |
| TypeScript | Type-safe API client, shared types |
| TailwindCSS | Utility-first styling |
| shadcn/ui | Component library (button, card, dialog, form, table, tabs, toast) |
| TanStack Query | Server state management, cache, refetch |
| aws-amplify | Cognito auth integration |
| react-hook-form + zod | Form validation |

### Infrastructure (IaC)

| Cong nghe | Mo ta |
|-----------|-------|
| Terraform | 1.7.0 - Infrastructure as Code, 12+ reusable modules |
| AWS ECR | Docker image registry (3 images: api, agents, ingestion) |
| GitHub Actions | CI/CD pipeline (build → push → terraform apply) |
| ARM64 (Graviton) | Lambda & Agent runtimes (cost optimization) |
| AWS Amplify | Frontend hosting + CI |

### Integrations

| Dich vu | Phuong thuc | Muc dich |
|---------|-------------|----------|
| Jira | MCP Gateway (Streamable HTTP + JWT) | Quan ly task (source of truth) |
| Slack | MCP Gateway (Streamable HTTP + JWT) | Lien lac noi bo |
| Cognito | JWT Auth + RBAC | Xac thuc nguoi dung (4 roles) |
| Secrets Manager | Encrypted storage | OAuth tokens (Jira, Slack) |
| KMS CMK | Encryption at rest | Bao mat du lieu DynamoDB |
| Bedrock KB | RAG + OpenSearch + Titan Embeddings | Tim kiem tri thuc to chuc |

---

## Cau truc thu muc

```
npo-ai-platform/
├── agents/                          # AI Agent implementations
│   ├── orchestrator/agent.py        # LangGraph-based orchestrator (Planner→Workers→Verifier→Synthesizer)
│   ├── project_task/agent.py        # Jira task management agent (MCP)
│   ├── knowledge/agent.py           # Knowledge base RAG agent (Bedrock KB)
│   ├── reporting/agent.py           # Report generation agent (DynamoDB + S3)
│   ├── communication/agent.py       # Slack communication agent (MCP)
│   ├── risk_analysis/agent.py       # Risk analysis agent (4 analytical tools)
│   ├── memory_extraction/agent.py   # Meeting memory extraction agent
│   ├── common/                      # Shared agent infrastructure
│   │   ├── contracts/               # Pydantic models (AgentTaskRequest, AgentTaskResult, UserRole, etc.)
│   │   ├── clients/                 # DynamoDB, S3, MCP, Jira, Workflow clients
│   │   ├── memory/                  # Bedrock AgentCore Memory store (MemoryStore protocol)
│   │   ├── model/                   # Bedrock LLM provider (BedrockProvider + get_strands_model)
│   │   ├── auth/                    # Authorization helpers
│   │   ├── observability/           # Structured logging, metrics
│   │   └── server.py                # aiohttp agent HTTP server (port 8080, /ping + /invocations)
│   └── Dockerfile                   # Agent container image (ARM64)
│
├── lambdas/                         # AWS Lambda functions
│   ├── api/handler.py               # Main REST API handler (70+ endpoints, regex routing)
│   ├── tools/handler.py             # MCP Gateway tool executor (9 tools)
│   ├── ingestion/                   # Document ingestion pipelines (SharePoint, Slack, S3, normalize)
│   ├── scheduled/                   # Scheduled tasks (daily report generation)
│   └── common/                      # Shared Lambda utilities (parse_body, build_response, PDF renderer)
│
├── shared/                          # Shared code (agents + lambdas)
│   ├── models/                      # Pydantic data models (project, task, risk, report, etc.)
│   └── report_generators.py         # Deterministic report content generators (no LLM)
│
├── gateway/                         # MCP Gateway tool schemas
│   └── tool-schemas/                # JSON schemas (9 tools: get_project, list_tasks, etc.)
│
├── frontend/                        # Next.js 14 web application
│   ├── app/                         # App Router pages
│   ├── components/                  # Reusable UI components
│   ├── lib/                         # API client, auth config, types
│   ├── hooks/                       # TanStack Query hooks
│   └── context/                     # AuthContext, ProjectContext
│
├── infra/                           # Terraform infrastructure (12+ modules)
│   ├── bootstrap/                   # Terraform remote state setup
│   ├── environments/dev/            # Dev environment configs (18 .tf files)
│   └── modules/                     # Reusable Terraform modules
│       ├── agentcore-runtime/       # Bedrock AgentCore runtimes (5 agents)
│       ├── agentcore-memory/        # AgentCore memory resources
│       ├── api/                     # API Gateway + routes + CORS
│       ├── auth/                    # Cognito user pool + client
│       ├── data/                    # DynamoDB tables (BusinessData + WorkflowState)
│       ├── storage/                 # S3 buckets (raw, curated, artifact)
│       ├── security/                # KMS CMK, IAM policies
│       ├── knowledge-base/          # Bedrock Knowledge Base + data sources
│       ├── ingestion/               # Document ingestion pipeline
│       ├── observability/           # CloudWatch dashboards + alarms
│       ├── report-scheduler/        # Scheduled report generation (EventBridge)
│       ├── gateway/                 # AgentCore MCP Gateway (JWT auth)
│       └── frontend/                # Amplify hosting
│
├── tests/                           # Test suite
│   └── evaluation/                  # Agent evaluation dataset + tests
│
├── docs/                            # Documentation
│   ├── api.md                       # REST API reference (full examples)
│   ├── operations.md                # Operations & monitoring guide
│   ├── architecture.md              # Architecture deep-dive
│   ├── deployment.md                # Deployment guide
│   └── security.md                  # Security documentation
│
├── .github/workflows/               # CI/CD
│   ├── deploy.yml                   # Build Docker images + Terraform deploy
│   ├── ci.yml                       # CI checks
│   └── pr.yml                       # PR validation
│
├── pyproject.toml                   # Python project config (uv)
├── uv.lock                          # Lock file
├── Makefile                         # Build automation
├── BUSINESS.md                      # Business impression document
└── README.md                        # This file
```

---

## API Reference

Xem chi tiet tai [`docs/api.md`](docs/api.md).

### Endpoints chinh

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| `POST` | `/v1/chat` | Gui tin nhan AI, nhan cau tra loi dong bo |
| `POST` | `/v1/workflows` | Tao workflow bat dong bo |
| `GET` | `/v1/workflows/{id}` | Kiem tra trang thai workflow |
| `POST` | `/v1/workflows/{id}/confirm` | Xac nhan hanh dong (dry-run → commit) |
| `POST` | `/v1/workflows/{id}/cancel` | Huy workflow |
| `GET` | `/v1/projects` | Liệt kê tat ca du an |
| `GET` | `/v1/projects/{id}` | Chi tiet du an |
| `GET` | `/v1/projects/{id}/tasks` | Tasks cua du an (tu Jira, fallback DynamoDB) |
| `GET` | `/v1/projects/{id}/risks` | Rui ro cua du an |
| `GET` | `/v1/projects/{id}/milestones` | Milestones |
| `GET` | `/v1/projects/{id}/issues` | Kho khan cua du an |
| `GET` | `/v1/projects/{id}/decisions` | Quyet dinh |
| `POST` | `/v1/projects/{id}/reports` | Tao bao cao moi |
| `POST` | `/v1/projects/{id}/daily-updates` | Gui cap nhat hang ngay |
| `GET` | `/v1/reports/leadership-summary` | Tong quan cho lanh dao |
| `POST` | `/v1/reports/{id}/export-pdf` | Export bao cao PDF |
| `GET` | `/v1/tasks` | Tat ca tasks (cross-project) |
| `GET` | `/v1/me/tasks` | Tasks cua toi (tu Jira) |
| `GET` | `/v1/me/notifications` | Thong bao |
| `GET` | `/v1/teams` | Liệt kê teams |
| `GET` | `/v1/users` | Liệt kê nguoi dung |
| `GET` | `/v1/issues` | Tat ca kho khan |
| `GET` | `/v1/decisions` | Tat ca quyet dinh |
| `GET` | `/v1/meetings` | Cuoc hop |
| `GET` | `/v1/documents` | Tai lieu tri thuc |
| `GET` | `/v1/handoffs` | Ban giao |
| `GET` | `/v1/offboarding` | Quy trinh roi di |
| `GET` | `/v1/activity-log` | Nhat ky hoat dong |
| `GET` | `/v1/roles/permissions` | Ma tran quyen |
| `POST` | `/v1/admin/auth/jira/login` | OAuth Jira (admin) |
| `POST` | `/v1/admin/auth/slack/login` | OAuth Slack (admin) |
| `POST` | `/v1/admin/users` | Tao nguoi dung (admin) |

### Chat Response Example

```json
{
  "workflow_id": "wf_a1b2c3d4",
  "status": "completed",
  "answer": "Dua tren du lieu tu Jira, du an Green Hope co 12 task dang thuc hien...",
  "citations": [
    {
      "citation_id": "cit_001",
      "source_system": "s3",
      "document_title": "Procurement Policy v2.1",
      "excerpt": "Tat ca mua sam vuot 500 USD can 2 buoc phe duyet..."
    }
  ],
  "artifacts": [],
  "approval": null
}
```

### Approval Flow (Human-in-the-Loop)

```json
{
  "workflow_id": "wf_a1b2c3d4",
  "status": "waiting_for_user",
  "answer": "Da chuan bi cap nhat task. Vui long xac nhan:",
  "approval": {
    "approval_id": "tok_xyz789",
    "action_type": "task_proposal",
    "action_preview": {
      "title": "Logistics Review",
      "assignee": "Minh",
      "due_date": "2026-01-17"
    },
    "status": "pending"
  }
}
```

---

## Frontend

Web application duoc xay dung bang **Next.js 14 App Router** voi client-side rendering, phuc vu nguoi dung NPO qua 4 workflow chinh.

| Workflow | Route | Chuc nang |
|----------|-------|-----------|
| WF-00 | `/login`, `/dashboard` | Cognito login + project context selector |
| WF-01 | `/dashboard/projects/[id]/knowledge` | Knowledge Q&A voi citations + evidence drawer |
| WF-02 | `/dashboard/projects/[id]` | Project overview, tasks, risks, milestones |
| WF-03 | `/dashboard/projects/[id]/tasks` | Task create/update voi dry-run preview + confirm |

---

## Trien khai

### Yeu cau

- AWS Account (ap-southeast-2)
- Python 3.12+
- Terraform 1.7.0+
- Docker (buildx, QEMU for ARM64)
- uv (Python package manager)
- Node.js 18+ (frontend)

### Local Development (khong can AWS)

```bash
# Cai dependencies
uv sync

# Chay tests
make test

# Khoi dong local stack
make local-up
# → Agents: http://localhost:8080-8084
# → DynamoDB Local: http://localhost:8000
# → Mock Gateway: http://localhost:9000

# Kiem tra health
curl http://localhost:8080/health
```

### Frontend Development

```bash
cd frontend
npm install          # Cai dependencies
npm run dev          # Khoi dong dev server → http://localhost:3000
npm run build        # Build production bundle
```

### Deploy len AWS

```bash
# 0. Bootstrap remote state
make bootstrap ENV=dev

# 1. Build images
make build-images IMAGE_TAG=$(git rev-parse --short HEAD)

# 2. Push to ECR
make push-images ENV=dev IMAGE_TAG=$(git rev-parse --short HEAD)

# 3. Terraform deploy
make terraform-init ENV=dev
make terraform-plan ENV=dev
make terraform-apply ENV=dev

# 4. Seed data & smoke test
make seed-data ENV=dev
make smoke-test ENV=dev
```

### CI/CD Pipeline

```
Push to main → GitHub Actions → Build Docker Images (ARM64) → Push to ECR
  → Terraform Init → Terraform Plan → Terraform Apply (auto-approve)
```

---

## Cau hinh moi truong

### Environment Variables (Agents)

| Bien | Mo ta | Mac dinh |
|------|-------|----------|
| `AGENT_NAME` | Ten agent hien tai | `orchestrator` |
| `BEDROCK_MODEL_ID` | Model ID cho Bedrock | `amazon.nova-lite-v1:0` |
| `AWS_REGION` | AWS region | `ap-southeast-2` |
| `BUSINESS_TABLE` | DynamoDB table ten | `BusinessData` |
| `KNOWLEDGE_BASE_ID` | Bedrock KB ID | (required) |
| `MEMORY_ID` | AgentCore Memory ID | (required) |
| `ARTIFACT_BUCKET` | S3 bucket cho artifacts | (required) |
| `GATEWAY_MCP_URL` | AgentCore Gateway MCP URL | (required) |
| `GATEWAY_CLIENT_ID` | Cognito client ID | (required) |
| `GATEWAY_CLIENT_SECRET` | Cognito client secret | (required) |
| `GATEWAY_USER_POOL_ID` | Cognito user pool ID | (required) |
| `GATEWAY_SCOPE` | OAuth scope | `gateway/invoke` |

### Agent Configurations (Terraform)

Moi agent chay tren Bedrock AgentCore Runtime voi model rieng:

```hcl
agent_configs = {
  orchestrator  = { model_id = "amazon.nova-lite-v1:0" }
  knowledge     = { model_id = "amazon.nova-lite-v1:0" }
  project_task  = { model_id = "amazon.nova-lite-v1:0" }
  reporting     = { model_id = "amazon.nova-lite-v1:0" }
  communication = { model_id = "amazon.nova-lite-v1:0" }
}
```

---

## Quan ly du lieu

### DynamoDB Single-Table Design

| Entity | PK | SK |
|--------|----|----|
| Project | `TENANT#<tenant>` | `PROJECT#<projectId>` |
| Task | `TENANT#<tenant>#PROJECT#<projectId>` | `TASK#<taskId>` |
| Risk | `TENANT#<tenant>#PROJECT#<projectId>` | `RISK#<riskId>` |
| Milestone | `TENANT#<tenant>#PROJECT#<projectId>` | `MILESTONE#<msId>` |
| Report | `TENANT#<tenant>#PROJECT#<projectId>` | `REPORT#<createdAt>#<reportId>` |
| DailyUpdate | `TENANT#<tenant>#PROJECT#<projectId>` | `DAILYUPDATE#<date>#<userId>` |
| Issue | `TENANT#<tenant>#PROJECT#<projectId>` | `ISSUE#<issueId>` |
| Decision | `TENANT#<tenant>#PROJECT#<projectId>` | `DECISION#<decisionId>` |
| Team | `TENANT#<tenant>` | `TEAM#<teamId>` |
| UserProfile | `TENANT#<tenant>` | `USERPROFILE#<userId>` |
| Notification | `TENANT#<tenant>#USER#<userId>` | `NOTIF#<createdAt>#<notifId>` |
| Activity | `TENANT#<tenant>` | `ACTIVITY#<createdAt>#<logId>` |
| Meeting | `TENANT#<tenant>` | `MEETING#<meetingId>` |
| KnowledgeDoc | `TENANT#<tenant>` | `KDOC#<docId>` |
| Handoff | `TENANT#<tenant>` | `HANDOFF#<handoffId>` |
| Offboarding | `TENANT#<tenant>` | `OFFBOARDING#<offId>` |
| RolePermissions | `TENANT#<tenant>` | `ROLE_PERMISSIONS` |
| Onboarding | `TENANT#<tenant>` | `ONBOARDING#default` |
| ChatSession | `TENANT#<tenant>#USER#<userId>` | `SESSION#<sessionId>` |
| SavedAnswer | `TENANT#<tenant>#USER#<userId>` | `SAVED#<savedId>` |
| WeeklyUpdate | `TENANT#<tenant>#USER#<userId>` | `UPDATE#<week>` |
| TeamReport | `TENANT#<tenant>#TEAM#<teamId>` | `REPORT#<week>` |

### Hybrid Data Strategy

```
Jira (Source of Truth) ──► MCP Gateway ──► Agent / API Lambda
                                                │
DynamoDB (App Data) ◄──────────────────────────┘
  - Aggregated metrics
  - Reports (generated, deterministic)
  - Decisions, Issues
  - User profiles, Teams
  - Notifications, Activity log
  - Chat sessions, Saved answers
  - Onboarding, Handoff, Offboarding
```

---

## Bao mat

### Authentication & Authorization

- **Cognito User Pool**: JWT-based authentication cho toan bo API
- **4 Roles**: Leader, Project Manager, Team Member, Volunteer
- **Role Permission Matrix**: Configurable per-action permissions, co the toggle qua API
- **Admin endpoints**: Restricted to Leader/Project Manager role

### Data Protection

- **KMS CMK**: DynamoDB tables encrypted at rest voi Customer Managed Key
- **Secrets Manager**: OAuth tokens (Jira, Slack) encrypted, chi truy cap boi Lambda/Agent
- **S3 SSE**: Server-side encryption cho tat ca buckets
- **PITR**: DynamoDB Point-in-Time Recovery enabled
- **Audit Logging**: Moi hanh dong deu duoc ghi vao Activity Log

### MCP Gateway Security

- **JWT Authorizer**: Custom JWT via Cognito cho Gateway access
- **Workload Identity**: Bedrock AgentCore workload identity cho agent-to-agent communication
- **Token caching**: JWT token cached voi 5-minute buffer before expiry

---

## Van hanh & Giam sat

Xem chi tiet tai [`docs/operations.md`](docs/operations.md).

### CloudWatch Dashboard

```
API 5xx Count | API Latency (p99) | Lambda Errors
Agent Invocations per agent name | DynamoDB Reads/Writes | Model Token Usage
KB Retrieval Count | Ingestion Lag | Error Rate
```

### CloudWatch Alarms

| Alarm | Threshold | Action |
|-------|-----------|--------|
| API 5xx errors | > 10 in 5min | SNS notification |
| API latency p99 | > 5000ms | SNS notification |
| Lambda errors | > 5 in 5min | SNS notification |
| Lambda throttles | > 0 | SNS notification |
| Agent runtime errors | > 3 in 5min | SNS notification |
| DynamoDB throttles | > 0 | SNS notification |
| KB ingestion failure | > 0 | SNS notification |

### Logging

Structured logging via `structlog`:
```python
logger.info("orchestrator_handle", role=role.value, workflow_id=workflow_id)
logger.error("sub_agent_error", agent=agent_name, error=str(e))
logger.info("bedrock_response", model_id=resolved, input_tokens=input_tokens)
```

---

## Testing

```bash
make test                    # Unit + contract tests
make test-integration        # Integration tests (moto)
make test-evaluation         # Evaluation dataset
make test-smoke              # Post-deploy smoke tests
```

### Evaluation Dataset

He thong co `tests/evaluation/evaluation_dataset.json` chua cac test cases danh gia chat luong tra loi cua agent.

---

## Tai lieu

| Tai lieu | Mo ta |
|----------|-------|
| [`docs/api.md`](docs/api.md) | REST API reference day du |
| [`docs/operations.md`](docs/operations.md) | Van hanh & giam sat |
| [`docs/architecture.md`](docs/architecture.md) | Kien truc chi tiet |
| [`docs/deployment.md`](docs/deployment.md) | Huong dan trien khai |
| [`docs/security.md`](docs/security.md) | Bao mat |
| [`BUSINESS.md`](BUSINESS.md) | Business impression document |

---

## License

Private - NPO AI Platform. All rights reserved.

---

**NPO AI Platform** — *Empowering Non-Profits with AI-Driven Project Intelligence*
