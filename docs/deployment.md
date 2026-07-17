# NPO AI Platform - Hướng dẫn triển khai

## Prerequisites

### Required Tools
```bash
# Nhà cung cấp dịch vụ AI CLI
aws --version  # >= 2.15
aws configure --profile npo-ai
# Enter: Access Key, Secret Key, Region: ap-southeast-2, Output: json

# Terraform
terraform --version  # >= 1.7.0

# Docker
docker --version  # >= 24.0
docker buildx version  # For multi-platform builds

# Python
python3 --version  # 3.12
uv --version  # >= 0.1.0 (package manager)
```

### Quick Setup
```bash
# Clone and install dependencies
cd npo-ai-platform
uv sync

# Verify tools
make lint
make test
```

---

## Deployment Steps

### Step 0: Bootstrap Remote State
```bash
# Creates S3 bucket for Terraform state + DynamoDB lock table
cd infra/bootstrap
terraform init
terraform apply \
  -var="project_name=npo-ai" \
  -var="environment=dev" \
  -var="aws_region=ap-southeast-2"

# Save outputs:
#   state_bucket = npo-ai-dev-tfstate
#   lock_table = npo-ai-dev-tflock
```

### Step 1: Build Docker Images
```bash
# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_TAG=$(git rev-parse --short HEAD)
REGION=ap-southeast-2

# Build agent image (ARM64, all 5 agents share same image)
docker build \
  --platform linux/arm64 \
  -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/agents:${IMAGE_TAG} \
  -f agents/Dockerfile \
  .

# Build lambda image (API + Tools + Ingestion share same base)
docker build \
  --platform linux/arm64 \
  -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/api:${IMAGE_TAG} \
  -f lambdas/Dockerfile \
  .

# Tag for other repos
docker tag \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/api:${IMAGE_TAG} \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/tools:${IMAGE_TAG}

docker tag \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/api:${IMAGE_TAG} \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/ingestion:${IMAGE_TAG}
```

### Step 2: Create ECR Repos & Push Images
```bash
# Create repos (if not exists)
for repo in agents api tools ingestion; do
  aws ecr create-repository \
    --repository-name npo-ai/${repo} \
    --region ${REGION} \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null || echo "Repo ${repo} exists"
done

# Login to ECR
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Push all images
for repo in agents api tools ingestion; do
  docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/npo-ai/${repo}:${IMAGE_TAG}
done
```

### Step 3: Terraform Plan & Apply
```bash
cd infra/environments/dev

# Initialize
terraform init

# Set image tag
export TF_VAR_image_tag=${IMAGE_TAG}

# Plan
terraform plan -out=tfplan

# Review plan output carefully, then apply
terraform apply tfplan
```

### Step 4: Create Cognito User (for testing)
```bash
# Get User Pool ID
USER_POOL_ID=$(terraform output -raw user_pool_id)

# Create test user
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password Temp1234! \
  --region ap-southeast-2

# Add to project_manager group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id ${USER_POOL_ID} \
  --username testuser \
  --group-name project_manager \
  --region ap-southeast-2

# Set permanent password (for testing)
aws cognito-idp admin-set-user-password \
  --user-pool-id ${USER_POOL_ID} \
  --username testuser \
  --password MyPassword123! \
  --permanent \
  --region ap-southeast-2
```

### Step 5: Seed Data
```bash
# Upload fixture data to DynamoDB and S3
TABLE_NAME=$(terraform output -raw business_data_table_name)
CURATED_BUCKET=$(terraform output -raw curated_bucket_name)

# Seed projects
python3 -c "
import json, boto3
dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-2')
table = dynamodb.Table('${TABLE_NAME}')
with open('fixtures/projects.json') as f:
    for p in json.load(f):
        pk = f\"TENANT#{p['tenant_id']}#PROJECT#{p['project_id']}\"
        table.put_item(Item={'PK': pk, 'SK': 'PROJECT', **{k: str(v) for k,v in p.items()}})
        print(f'Created: {p[\"name\"]}')
"

# Upload seed documents to S3
python3 -c "
import json, boto3
s3 = boto3.client('s3', region_name='ap-southeast-2')
for fname in ['fixtures/meeting_notes.json', 'fixtures/policies.json']:
    with open(fname) as f:
        for doc in json.load(f):
            key = f'tenant-aiv/general/{doc.get(\"source_system\",\"sharepoint\")}/{doc.get(\"id\")}.txt'
            s3.put_object(Bucket='${CURATED_BUCKET}', Key=key, Body=doc.get('content','').encode())
            print(f'Uploaded: {key}')
"
```

### Step 6: Smoke Test
```bash
API_URL=$(terraform output -raw api_url)
echo "API: ${API_URL}"

# Health check
curl -sf ${API_URL}/health | python3 -m json.tool

# Auth test (unauthorized should return 401)
curl -s -o /dev/null -w "Status: %{http_code}\n" ${API_URL}/v1/chat
# Expected: Status: 401

# Get JWT token (using AWS CLI)
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id $(terraform output -raw client_id) \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=testuser,PASSWORD=MyPassword123! \
  --region ap-southeast-2 \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Authenticated request
curl -sf ${API_URL}/v1/chat \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "What projects are active?"}' | python3 -m json.tool
```

---

## Environment Variables Reference

### API Lambda
```env
BUSINESS_TABLE=npo-ai-dev-business-data     # DynamoDB business data table
WORKFLOW_TABLE=npo-ai-dev-workflow-state     # DynamoDB workflow state table
RAW_BUCKET=npo-ai-dev-raw                   # S3 raw documents bucket
CURATED_BUCKET=npo-ai-dev-curated           # S3 curated documents bucket
ARTIFACT_BUCKET=npo-ai-dev-artifact         # S3 report artifacts bucket
REGION=ap-southeast-2                        # AWS region
```

### Agent Runtime
```env
MODEL_PROVIDER=bedrock                       # bedrock | mock
AGENT_NAME=orchestrator                      # Agent identifier
AWS_REGION=ap-southeast-2
GATEWAY_ENDPOINT=https://<gateway-id>.bedrock-agentcore.amazonaws.com
```

### Ingestion Lambdas
```env
BUSINESS_TABLE=npo-ai-dev-business-data
RAW_BUCKET=npo-ai-dev-raw
CURATED_BUCKET=npo-ai-dev-curated
USE_FIXTURE_MODE=true                        # true for dev, false for production
```

---

## Local Development

### Without AWS (mock mode)
```bash
# Start all services locally
docker compose up -d

# Check health
curl http://localhost:8080/health

# API is available at http://localhost:8080
# DynamoDB Local at http://localhost:8000
# Mock Gateway at http://localhost:9000

# View logs
docker compose logs -f orchestrator

# Stop
docker compose down
```

### Local Testing
```bash
# Run unit tests (no AWS needed)
uv run pytest tests/unit -v

# Run contract tests
uv run pytest tests/contract -v

# Run integration tests (uses moto for AWS mocking)
uv run pytest tests/integration -v
```

---

## Updating Deployment

### Update Agent Code
```bash
# 1. Build new image with new tag
IMAGE_TAG=$(git rev-parse --short HEAD)
make build-images IMAGE_TAG=${IMAGE_TAG}

# 2. Push to ECR
make push-images ENV=dev IMAGE_TAG=${IMAGE_TAG}

# 3. Update Terraform to use new image tag
cd infra/environments/dev
terraform apply -var="image_tag=${IMAGE_TAG}"

# Terraform will update Lambda function and AgentCore runtime to use new image
```

### Update Terraform Modules
```bash
cd infra/environments/dev
terraform plan  # Review changes
terraform apply
```

---

## Rollback

### Rollback Image
```bash
# Set previous image tag
terraform apply -var="image_tag=<previous-git-sha>"

# Lambda will update to previous image
# AgentCore runtime will update to previous version
```

### Rollback Terraform
```bash
# View state history
terraform state list

# Import resources if needed
terraform import module.api.aws_apigatewayv2_api.main <api-id>
```

---

## Cleanup

```bash
# Destroy all resources (CAREFUL!)
cd infra/environments/dev
terraform destroy

# Delete ECR images
for repo in agents api tools ingestion; do
  aws ecr delete-repository --repository-name npo-ai/${repo} --force --region ap-southeast-2
done

# Delete remote state (last step!)
cd ../../bootstrap
terraform destroy
```
