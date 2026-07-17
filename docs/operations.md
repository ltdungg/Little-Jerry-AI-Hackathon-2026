# NPO AI Platform - Vận hành

## 1. Monitoring

### CloudWatch Dashboard
```
Dashboard name: npo-ai-dev-dashboard

Widgets:
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ API 5xx Count       │ API Latency (p99)   │ Lambda Errors       │
│ (alarm if > 10/hr)  │ (alarm if > 5s)     │ (alarm if > 5/hr)   │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Agent Invocations   │ DynamoDB Reads      │ DynamoDB Writes     │
│ per agent name      │ consumed capacity   │ consumed capacity   │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Model Token Usage   │ KB Retrieval Count  │ Ingestion Lag       │
│ input + output      │ empty result rate   │ documents pending   │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### CloudWatch Alarms
```
┌──────────────────────────────┬───────────────┬────────────────────┐
│ Alarm                        │ Threshold     │ Action             │
├──────────────────────────────┼───────────────┼────────────────────┤
│ API 5xx errors               │ > 10 in 5min  │ SNS notification   │
│ API latency p99              │ > 5000ms      │ SNS notification   │
│ Lambda errors                │ > 5 in 5min   │ SNS notification   │
│ Lambda throttles             │ > 0           │ SNS notification   │
│ Agent runtime errors         │ > 3 in 5min   │ SNS notification   │
│ DynamoDB throttles           │ > 0           │ SNS notification   │
│ KB ingestion failure         │ > 0           │ SNS notification   │
│ Ingestion freshness          │ > 24 hours    │ SNS notification   │
└──────────────────────────────┴───────────────┴────────────────────┘
```

### Log Analysis
```bash
# Xem API Lambda logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/npo-ai-dev-api \
  --filter-pattern "ERROR" \
  --region ap-southeast-2

# Xem Orchestrator Agent logs
aws logs filter-log-events \
  --log-group-name /aws/bedrock-agentcore/npo-ai-dev-orchestrator \
  --filter-pattern "{ $.status = \"failed\" }"

# Tìm correlation_id cụ thể
aws logs filter-log-events \
  --log-group-name /aws/lambda/npo-ai-dev-api \
  --filter-pattern "{ $.correlation_id = \"abc-123\" }"
```

---

## 2. CloudWatch Metrics

### Custom Metrics (Agent-level)
```python
# Agent emitting metrics
{
  "metric_name": "agent_invocation",
  "dimensions": [
    {"name": "agent_name", "value": "knowledge-agent"},
    {"name": "status", "value": "completed"},
    {"name": "tenant_id", "value": "tenant-aiv"}
  ],
  "value": 1,
  "unit": "Count"
}

# Key metrics to watch:
- agent_invocation.count          → Total invocations per agent
- agent_invocation.latency_ms     → Latency per invocation
- agent_invocation.tokens_used    → Model token consumption
- tool_invocation.count           → Tool calls per tool name
- tool_invocation.error_count     → Tool errors
- kb_retrieval.count              → Knowledge base queries
- kb_retrieval.empty_result_count → Queries with no results
- workflow_completion.rate        → Success/failure ratio
```

---

## 3. DynamoDB Management

### Monitoring
```bash
# Check consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=npo-ai-dev-business-data \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Common Queries
```python
# List all projects for a tenant
import boto3
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('npo-ai-dev-business-data')

response = table.query(
    KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues={
        ':pk': 'TENANT#tenant-aiv#PROJECT#proj-green-hope',
        ':sk': 'PROJECT'
    }
)
```

### Cleanup Old Workflows
```python
# Delete expired workflows (TTL handles this automatically)
# But for immediate cleanup:
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('npo-ai-dev-workflow-state')

# Scan for expired items (TTL = expires_at attribute)
response = table.scan(
    FilterExpression='attribute_exists(expires_at) AND expires_at < :now',
    ExpressionAttributeValues={':now': int(datetime.now().timestamp())}
)
```

---

## 4. S3 Management

### Lifecycle Policies
```
Raw bucket:     Objects expire after 365 days
Curated bucket: Noncurrent versions expire after 30 days
Artifact bucket: No expiration (keep reports forever)
Access logs:    Expire after 90 days
```

### Checking Bucket Contents
```bash
# List curated documents
aws s3 ls s3://npo-ai-dev-curated/tenant-aiv/ --recursive

# Check ingestion status
aws s3 ls s3://npo-ai-dev-raw/tenant-aiv/sharepoint/ --recursive | wc -l

# Download a specific document
aws s3 cp s3://npo-ai-dev-curated/tenant-aiv/proj-green-hope/sharepoint/policy-001.txt -
```

---

## 5. Knowledge Base Management

### Check Ingestion Status
```bash
# List knowledge bases
aws bedrock-agent list-knowledge-bases --region ap-southeast-2

# Check ingestion jobs
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id <kb-id> \
  --data-source-id <ds-id> \
  --region ap-southeast-2

# Start manual ingestion
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id <kb-id> \
  --data-source-id <ds-id> \
  --region ap-southeast-2
```

### Test Retrieval
```bash
# Query knowledge base directly
aws bedrock-agent retrieve \
  --knowledge-base-id <kb-id> \
  --retrieval-query '{"text": "procurement approval process"}' \
  --region ap-southeast-2
```

---

## 6. ECR Image Management

### List Images
```bash
# List all images in agents repo
aws ecr describe-images \
  --repository-name npo-ai/agents \
  --region ap-southeast-2 \
  --query 'sort_by(imageDetails,&imagePushedAt)[*].[imageTags,imageSizeBytes,imagePushedAt]' \
  --output table
```

### Pull Image for Local Testing
```bash
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com

docker pull <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/npo-ai/agents:latest
```

---

## 7. Incident Response

### Troubleshooting Flowchart
```
API returning errors?
├── Check API Gateway logs → CloudWatch /aws/apigateway/...
├── Check Lambda logs → CloudWatch /aws/lambda/npo-ai-dev-api
├── Check DynamoDB throttles → CloudWatch DynamoDB metrics
└── Check model availability → Bedrock console

Agent failing?
├── Check agent runtime logs → CloudWatch
├── Check /ping endpoint → curl https://<endpoint>/ping
├── Check IAM permissions → CloudWatch Access Denied errors
└── Check model quotas → Bedrock console

Ingestion stuck?
├── Check SQS DLQ → messages in dlq = failures
├── Check EventBridge → schedule running?
├── Check DynamoDB checkpoints → last sync timestamp
└── Check S3 → raw documents present?
```

### Recovery from Terraform State Loss
```bash
# If AgentCore resources exist but Terraform lost state:
# 1. Find the resource
aws bedrock-agent list-agent-runtimes --region ap-southeast-2

# 2. Import into Terraform
cd infra/environments/dev
terraform import module.agentcore.aws_cloudformation_stack.agent_runtimes["orchestrator"] \
  npo-ai-dev-orchestrator-runtime

# 3. Verify plan shows no changes
terraform plan
```

---

## 8. Scaling Considerations

### Current Limits (MVP)
```
API Gateway: 1000 burst, 500/s sustained
Lambda: 1000 concurrent executions (default)
DynamoDB: On-demand (no capacity planning needed)
AgentCore: 1 runtime per agent (scales with Bedrock)
```

### When to Scale
```
API latency > 5s consistently → Consider provisioned concurrency
DynamoDB throttles → Already on-demand, check hot partitions
Lambda cold starts → Increase memory or use provisioned concurrency
Agent response time → Check model quotas, consider smaller model for simple tasks
```

### Cost Optimization
```
1. Use smaller models for simple tasks (Knowledge, Task agents)
2. Use larger models only for Orchestrator and Reporting
3. Cache frequently accessed documents in DynamoDB
4. Set TTL on workflow state (7 days default)
5. Lifecycle policies on S3 (auto-delete old raw documents)
6. Monitor token usage per agent in CloudWatch
```
