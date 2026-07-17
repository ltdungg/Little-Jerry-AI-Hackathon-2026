.PHONY: bootstrap test build-images push-images terraform-init terraform-plan terraform-apply smoke-test lint fmt clean

ENV ?= dev
IMAGE_TAG ?= $(shell git rev-parse --short HEAD)
AWS_REGION ?= ap-southeast-2
PROJECT_NAME ?= npo-ai
ACCOUNT_ID ?= $(shell aws sts get-caller-identity --query Account --output text)

# ── Bootstrap: create remote state + ECR repos ──
bootstrap:
	cd infra/bootstrap && terraform init && terraform apply -auto-approve \
		-var="project_name=$(PROJECT_NAME)" \
		-var="environment=$(ENV)" \
		-var="aws_region=$(AWS_REGION)"
	@echo "Bootstrap complete. Now create ECR repos:"
	@for repo in agents api tools ingestion; do \
		aws ecr create-repository \
			--repository-name $(PROJECT_NAME)/$$repo \
			--region $(AWS_REGION) \
			--image-scanning-configuration scanOnPush=true \
			--encryption-configuration encryptionType=AES256 \
			2>/dev/null || echo "Repo $$repo already exists"; \
	done

# ── Test ──
test:
	uv run pytest tests/unit tests/contract -v

test-integration:
	uv run pytest tests/integration -v

test-evaluation:
	uv run pytest tests/evaluation -v

test-smoke:
	uv run pytest tests/smoke -v -m smoke

# ── Build Docker images ──
build-images:
	@echo "Building images with tag $(IMAGE_TAG)..."
	@for repo in agents api tools ingestion; do \
		docker build \
			--platform linux/arm64 \
			-t $(ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(PROJECT_NAME)/$$repo:$(IMAGE_TAG) \
			-f $$( [ "$$repo" = "agents" ] && echo "agents/Dockerfile" || echo "lambdas/Dockerfile" ) \
			. ; \
	done
	@echo "Build complete."

# ── Push images to ECR ──
push-images:
	@echo "Pushing images to ECR ($(AWS_REGION))..."
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	@for repo in agents api tools ingestion; do \
		docker push $(ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(PROJECT_NAME)/$$repo:$(IMAGE_TAG); \
	done
	@echo "Push complete."

# ── Terraform ──
terraform-init:
	cd infra/environments/$(ENV) && terraform init

terraform-plan:
	cd infra/environments/$(ENV) && terraform plan \
		-var="image_tag=$(IMAGE_TAG)" \
		-out=tfplan

terraform-apply:
	cd infra/environments/$(ENV) && terraform apply \
		-var="image_tag=$(IMAGE_TAG)" \
		tfplan

# ── Smoke test ──
smoke-test:
	@echo "Running smoke tests for $(ENV)..."
	API_URL=$$(cd infra/environments/$(ENV) && terraform output -raw api_url 2>/dev/null || echo "https://api.$(ENV).$(PROJECT_NAME).example.com"); \
	echo "API: $$API_URL"; \
	echo "1. Health check..."; \
	curl -sf "$$API_URL/health" && echo " ✓" || echo " ✗ health failed"; \
	echo "2. Auth required..."; \
	curl -s -o /dev/null -w "%{http_code}" "$$API_URL/v1/chat" | grep -q 401 && echo " ✓" || echo " ✗ auth check failed"

# ── Code quality ──
lint:
	uv run ruff check .
	uv run mypy agents/ lambdas/ --ignore-missing-imports

fmt:
	uv run ruff format .

# ── Clean ──
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .mypy_cache .ruff_cache .pytest_cache
