# Triển Khai CI/CD

## Tổng Quan

GitHub Actions với 3 workflow: `ci.yml` (CI), `pr.yml` (PR validation), `deploy.yml` (deployment).

## Pipeline

```
Git Push → CI (lint → test → security → build → terraform plan)
PR → PR Validation (lint, test, security, terraform)
Merge to main → Deploy (build images → push ECR → terraform apply)
```

## Workflows

### ci.yml — Push/PR to main
1. **Lint:** ruff check + ruff format --check
2. **Test:** pytest (cần lint pass)
3. **Security:** pip-audit + Trivy filesystem scan
4. **Build:** Docker buildx linux/arm64 → push ECR (cần lint + test pass)
5. **Terraform:** fmt -check, validate, tfsec, plan (cần lint pass)

### pr.yml — Pull Request
Single job validate: lint → test → security → terraform fmt/plan

### deploy.yml — Push to main hoặc manual dispatch
1. **Build & Push:** Build 3 Docker images (api, agents, ingestion) với SHA tag + latest tag, push lên ECR
2. **Deploy:** Terraform init → plan → apply -auto-approve

## Docker Images

| Image | Dockerfile | Mục Đích |
|-------|-----------|----------|
| `npo-ai/api` | `lambdas/Dockerfile` | API Lambda + Tools + Webhook |
| `npo-ai/agents` | `agents/Dockerfile` | Agent runtimes |
| `npo-ai/ingestion` | `lambdas/Dockerfile` | Ingestion + Scheduled Lambdas |

Tất cả build linux/arm64, tagged với git SHA (8 ký tự) + latest.

## GitHub Secrets Cần Thiết

| Secret | Mô Tả |
|--------|-------|
| `AWS_ACCOUNT_ID` | AWS Account ID |
| `AWS_ACCESS_KEY_ID` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `AWS_REGION` | Region (default: ap-southeast-2) |

## Makefile Commands

| Command | Chức Năng |
|---------|-----------|
| `make bootstrap` | Tạo ECR repositories |
| `make test` | Chạy unit + contract tests |
| `make test-integration` | Chạy integration tests |
| `make test-evaluation` | Chạy evaluation tests |
| `make test-smoke` | Chạy smoke tests |
| `make build-images` | Build tất cả Docker images |
| `make push-images` | Push images lên ECR |
| `make deploy` | Full pipeline: build + push + terraform |
| `make deploy-latest` | Deploy với image_tag=latest |
| `make lint` | ruff check + mypy |
| `make fmt` | ruff format |
| `make clean` | Xóa __pycache__, .pyc |

## Environment Promotion

1. **Dev:** Auto-deploy khi merge to main
2. **Staging:** Manual deploy với verified image tag
3. **Production:** Manual deploy với image tag đã test trên staging

## Rollback

- **Docker:** Deploy lại với image tag trước đó
- **Terraform:** Dùng `terraform state` để restore resource
