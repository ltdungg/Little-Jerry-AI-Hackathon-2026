# Kiểm Thử

## Tổng Quan

Pytest với 5 loại test: Unit, Contract, Integration, Evaluation, Smoke.

## Cấu Trúc

```
tests/
├── unit/           # 12 test files — unit tests
├── contract/       # 3 test files — schema validation
├── integration/    # 2 test files — tích hợp components
├── evaluation/     # Dataset + test runner — đánh giá AI
└── smoke/          # 1 test file — smoke test nhanh
```

## Chạy Tests

| Command | Loại Test |
|---------|----------|
| `make test` | Unit + Contract tests |
| `make test-integration` | Integration tests |
| `make test-evaluation` | Evaluation tests |
| `make test-smoke` | Smoke tests |
| `uv run pytest -v` | Tất cả tests |
| `uv run pytest --cov=agents --cov=lambdas --cov=shared` | Với coverage report |

## Unit Tests (12 files)

| File | Kiểm Thử |
|------|---------|
| `test_contracts.py` | Pydantic models (AgentTaskRequest, AgentTaskResult) |
| `test_routing.py` | API route matching |
| `test_authorization.py` | RBAC permissions (4 roles × 11 capabilities) |
| `test_dynamodb_keys.py` | DynamoDB key patterns |
| `test_citations.py` | Citation formatting |
| `test_dry_run.py` | Dry-run mode |
| `test_orchestrator.py` | Orchestrator logic |
| `test_model_provider.py` | Bedrock/Mock provider |
| `test_shared_models.py` | Shared Pydantic models |
| `test_business_data_client.py` | DynamoDB CRUD operations |
| `test_report_generators.py` | Report content generation |
| `conftest.py` | Shared fixtures (mock dynamodb, bedrock, s3) |

## Contract Tests (3 files)

| File | Kiểm Thử |
|------|---------|
| `test_agent_schemas.py` | Agent Pydantic model schemas |
| `test_api_schemas.py` | API request/response schemas |
| `test_gateway_schemas.py` | Gateway tool JSON schemas (9 tools) |

## Integration Tests (2 files)

| File | Kiểm Thử |
|------|---------|
| `test_agent_invocation.py` | Gọi agents thật qua HTTP |
| `test_api_lambda.py` | Lambda handler với request thực |

## Evaluation Tests

- **evaluation_dataset.json:** Test cases cho intent classification, response quality
- **test_evaluation.py:** Chạy evaluation, đo accuracy (target ≥ 85%)
- **run_eval.py:** Script chạy evaluation suite

## Smoke Tests

Quick sanity check: API health endpoint trả 200, chat endpoint trả 401 không có token.

## Fixtures

Dữ liệu mock: mock_dynamodb, mock_bedrock, mock_s3, sample_project, sample_task, mock_jira_response.

## Best Practices

- Tests independent, không phụ thuộc nhau
- Async tests dùng `@pytest.mark.asyncio`
- Parametrized tests cho multiple inputs
- Coverage target: ≥ 80%
