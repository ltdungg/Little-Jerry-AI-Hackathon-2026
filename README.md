# NPO AI Platform

Hệ thống trợ lý AI đa tác vụ cho tổ chức phi lợi nhuận (NPO). Sử dụng mô hình **Orchestrator Workflow** với nhiều agent chuyên biệt trên nền tảng Amazon Bedrock AgentCore.

## Tổng quan

```
User → Next.js 14 Web App → Cognito Auth → API Gateway → API Lambda → Orchestrator Agent
                                                                       ├── Knowledge Agent
                                                                       ├── Project & Task Agent
                                                                       ├── Reporting Agent
                                                                       └── Communication Agent
                                                                           └── AgentCore Gateway → Lambda Tools
```

## Tính năng chính

- **Tìm kiếm tri thức**: Hỏi đáp từ tài liệu tổ chức (SharePoint, Google Drive, Slack) với citation
- **Quản lý dự án**: Xem tasks, milestones, risks; tạo/cập nhật task với dry-run & confirmation
- **Tạo báo cáo**: Weekly status, risk summary, donor reports từ dữ liệu verified
- **Giao tiếp**: Tạo nháp Slack, gửi sau khi user confirm
- **Bảo mật**: Tenant isolation, RBAC, prompt injection defense, audit logging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + React 18 + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query |
| Auth | AWS Cognito |
| API | API Gateway HTTP API + Lambda (container) |
| Agents | Amazon Bedrock AgentCore Runtime |
| Framework | Strands Agents + Pydantic |
| Data | DynamoDB (state) + S3 (documents) |
| Knowledge | Amazon Bedrock Knowledge Bases |
| IaC | Terraform |
| Region | ap-southeast-2 |

## Cấu trúc thư mục

```
├── agents/                    # Agent implementations
│   ├── common/                # Shared: contracts, clients, auth, observability
│   ├── orchestrator/          # Orchestrator agent
│   ├── knowledge/             # Knowledge retrieval agent
│   ├── project_task/          # Project & task management agent
│   ├── reporting/             # Report generation agent
│   ├── communication/         # Communication agent
│   ├── prompts/               # Versioned system prompts
│   └── Dockerfile             # AgentCore container image
├── lambdas/                   # Lambda functions
│   ├── api/                   # API Lambda handler
│   ├── tools/                 # Gateway tool Lambdas (9 tools)
│   ├── ingestion/             # SharePoint/Slack ingestion
│   ├── common/                # Shared utilities
│   └── Dockerfile             # Lambda container image
├── gateway/tool-schemas/      # JSON schemas for AgentCore Gateway
├── infra/                     # Terraform IaC
│   ├── bootstrap/             # Remote state setup
│   ├── modules/               # 12 reusable modules
│   └── environments/dev/      # Dev environment stack
├── fixtures/                  # Sample NPO data (projects, tasks, docs)
├── tests/                     # Unit, contract, integration, evaluation, smoke
├── scripts/                   # Build, push, seed, smoke-test scripts
├── frontend/                  # Next.js 14 web application
│   ├── app/                   # App Router pages (login, dashboard, projects, tasks, risks, knowledge)
│   ├── components/            # Reusable UI & feature components (shell, auth, chat, projects, tasks, shared)
│   ├── lib/                   # API client, auth config, types, utilities
│   ├── hooks/                 # TanStack Query hooks (useProjects, useTasks, useRisks, useChat, useTaskMutation)
│   └── context/               # AuthContext, ProjectContext (React Context)
├── docs/                      # Architecture, deployment, security, API docs
└── Makefile                   # Build automation
```

## Bắt đầu nhanh

### Local Development (không cần AWS)
```bash
# Cài dependencies
uv sync

# Chạy tests
make test

# Khởi động local stack
make local-up
# → Agents: http://localhost:8080-8084
# → DynamoDB Local: http://localhost:8000
# → Mock Gateway: http://localhost:9000

# Kiểm tra health
curl http://localhost:8080/health
```

### Frontend Development
```bash
cd frontend
npm install          # Cài dependencies
npm run dev          # Khởi động dev server → http://localhost:3000
npm run build        # Build production bundle
```

Biến môi trường frontend: xem [docs/deployment.md](docs/deployment.md)

### Deploy lên nhà cung cấp dịch vụ AI
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

Chi tiết từng bước: [docs/deployment.md](docs/deployment.md)

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/chat | Chat đồng bộ |
| POST | /v1/workflows | Tạo workflow bất đồng bộ |
| GET | /v1/workflows/{id} | Xem trạng thái workflow |
| POST | /v1/workflows/{id}/confirm | Xác nhận hành động |
| POST | /v1/workflows/{id}/cancel | Hủy workflow |
| GET | /v1/reports/{id} | Xem báo cáo |
| GET | /health | Health check |

Chi tiết: [docs/api.md](docs/api.md)

## Frontend

Web application được xây dựng bằng **Next.js 14 App Router** với client-side rendering, phục vụ người dùng NPO qua 4 workflow chính.

| Workflow | Route | Chức năng |
|----------|-------|-----------|
| WF-00 | /login, /dashboard | Cognito login + project context selector |
| WF-01 | /dashboard/projects/[id]/knowledge | Knowledge Q&A với citations + evidence drawer |
| WF-02 | /dashboard/projects/[id] | Project overview, tasks, risks, milestones |
| WF-03 | /dashboard/projects/[id]/tasks | Task create/update với dry-run preview + confirm |

### Công nghệ
- **Next.js 14** — App Router, server components (layout), client components (pages)
- **React 18** — functional components, hooks
- **TypeScript** — type-safe API client, shared types
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — component library (button, card, dialog, form, table, tabs, toast, ...)
- **TanStack Query** — server state management, cache, refetch
- **aws-amplify** — Cognito auth integration
- **react-hook-form + zod** — form validation

## Tài liệu

- [Kiến trúc](docs/architecture.md) - Mỗi service hoạt động như thế nào
- [Triển khai](docs/deployment.md) - Hướng dẫn deploy chi tiết
- [API](docs/api.md) - Tham chiếu API đầy đủ
- [Bảo mật](docs/security.md) - Auth, encryption, audit
- [Vận hành](docs/operations.md) - Monitoring, scaling, troubleshooting
- [Data Model](data-model.md) - DynamoDB keys, entities, access patterns
- [Mock Data](fixtures/) - Sample NPO data (projects, tasks, documents)

## Agents

| Agent | Chức năng | Model |
|-------|----------|-------|
| Orchestrator | Phân loại, lập kế hoạch, phối hợp | Claude Sonnet |
| Knowledge | Tìm kiếm tri thức, citation | Claude Sonnet |
| Project & Task | Quản lý tasks, dry-run writes | Claude Sonnet |
| Reporting | Tạo báo cáo từ verified data | Claude Sonnet |
| Communication | Tạo nháp Slack/email | Claude Sonnet |

## Lambda Tools (9 tools)

| Tool | Mutating | Confirmation |
|------|----------|-------------|
| get_project | No | - |
| list_project_tasks | No | - |
| list_overdue_tasks | No | - |
| list_project_risks | No | - |
| propose_task_change | No (dry-run) | - |
| commit_task_change | Yes | Required |
| store_report_artifact | Yes | - |
| create_slack_draft | No | - |
| send_slack_message | Yes | Required |

## Testing

```bash
make test                    # Unit + contract tests
make test-integration        # Integration tests (moto)
make test-evaluation         # Evaluation dataset
make test-smoke              # Post-deploy smoke tests
```

## License

TBD
