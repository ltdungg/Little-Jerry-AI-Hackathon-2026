# Hạ Tầng Terraform

## Tổng Quan

Quản lý hạ tầng AWS bằng Terraform, region mặc định: `ap-southeast-2`.

## Cấu Trúc

```
infra/
├── bootstrap/              # ECR repositories (4 repos: agents, api, tools, ingestion)
├── environments/
│   ├── dev/                # Môi trường development
│   ├── staging/
│   └── prod/
└── modules/
    ├── agentcore-runtime/  # AgentCore runtimes + Tools Lambda + Jira Webhook
    ├── auth/               # Cognito User Pool + Client
    └── gateway/            # MCP Gateway + Jira/Slack targets
```

## Tài Nguyên Chính

### ECR Repositories (Bootstrap)
- `npo-ai/agents` — Agent container images
- `npo-ai/api` — API Lambda images
- `npo-ai/tools` — Tools Lambda images
- `npo-ai/ingestion` — Ingestion Lambda images

Tất cả AES256 encryption, image scanning on push.

### AgentCore Runtimes (agentcore.tf)
- **10 Agent Runtimes:** Mỗi agent có runtime riêng trên Bedrock AgentCore, model `amazon.nova-lite-v1:0`, memory 7-30 ngày tùy agent
- **Tools Lambda:** Docker image Lambda, handler `lambdas.tools.handler.lambda_handler`, 256MB, timeout 30s
- **Agent Execution Roles:** IAM role riêng cho mỗi agent với quyền invoke model, DynamoDB CRUD, S3 read/write, Secrets Manager read, KMS decrypt
- **Jira Webhook Lambda:** Docker image, API Gateway V2 route `POST /jira/webhook`

### MCP Gateway (gateway.tf)
- Gateway tên `npo-ai-dev-gateway-v7`, protocol MCP, authorizer Custom JWT (Cognito)
- Target **Jira:** Atlassian integration, OAuth2 auth
- Target **Slack:** Custom endpoint, Bearer token auth

### Slack Bot (slack_bot.tf)
- **Receiver Lambda:** Python 3.12 ZIP, 512MB, timeout 10s — nhận sự kiện Slack, xác thực chữ ký
- **Invoker Lambda:** Python 3.12 ZIP, 256MB, timeout 900s — invoke Orchestrator AgentCore
- **Function URL:** Public (auth=NONE) cho Slack event delivery
- **API Gateway V2:** Route `POST /slack/events`

## Variables Chính

| Variable | Mặc Định | Mô Tả |
|----------|----------|-------|
| `project_name` | `npo-ai` | Tên project |
| `environment` | `dev` | Môi trường |
| `aws_region` | `ap-southeast-2` | Region |
| `image_tag` | `latest` | Docker image tag |
| `agent_configs` | (xem file) | Cấu hình model/memory cho từng agent |

## Outputs

| Output | Mô Tả |
|--------|-------|
| `agent_runtimes` | ARN các AgentCore runtimes |
| `tools_lambda_arn` | ARN Tools Lambda |
| `gateway_url` | MCP Gateway URL |
| `slack_receiver_function_url` | Slack Receiver Function URL |
| `slack_apigw_url` | Slack API Gateway URL |

## Triển Khai

```bash
cd infra/bootstrap && terraform init && terraform apply
cd infra/environments/dev && terraform init && terraform plan -out=tfplan && terraform apply tfplan
```

## Best Practices

- **Remote state:** S3 backend + DynamoDB locking
- **Least privilege:** Mỗi resource có IAM role riêng
- **ARM64:** Lambda trên Graviton2 để tiết kiệm chi phí
- **PAY_PER_REQUEST:** DynamoDB và API Gateway
