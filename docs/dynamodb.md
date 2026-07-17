# DynamoDB Data Layer

Tài liệu tham chiếu cho DynamoDB schema, key patterns, GSI definitions và access patterns.源头: `data-model.md` sections 7–9.

---

## 1. Tổng quan

Hai bảng DynamoDB chính:

| Table | Mục đích | Billing |
|---|---|---|
| `BusinessData` | Tenant, User, Project, Task, Risk, Milestone, Report, Connector, Sync, Document | PAY_PER_REQUEST |
| `WorkflowState` | Workflow, AgentTask, WorkflowEvent, Approval, Idempotency, Projection, Session | PAY_PER_REQUEST |

Bảng tên thực: `${project_name}-${environment}-business-data` / `${project_name}-${environment}-workflow-state`

Cả hai bảng dùng single-table pattern với:
- Partition key: `PK` (String)
- Sort key: `SK` (String)
- TTL attribute: `expires_at` (Number, epoch seconds)
- Encryption: KMS
- PITR: enabled
- Deletion protection: config per environment

---

## 2. BusinessData Table

### 2.1 Attribute definitions

| Attribute | Type |
|---|---|
| `PK` | String (partition key) |
| `SK` | String (sort key) |
| `GSI1PK` | String |
| `GSI1SK` | String |
| `GSI2PK` | String |
| `GSI2SK` | String |

GSI attributes là sparse: item không có access pattern tương ứng thì không có GSI keys.

### 2.2 Key patterns

| Entity | PK | SK |
|---|---|---|
| Tenant | `TENANT#<tenantId>` | `META` |
| Program | `TENANT#<tenantId>` | `PROGRAM#<programId>` |
| User profile | `TENANT#<tenantId>#USER#<userId>` | `PROFILE` |
| Tenant membership | `TENANT#<tenantId>#USER#<userId>` | `MEMBERSHIP` |
| User → project edge | `TENANT#<tenantId>#USER#<userId>` | `PROJECT#<projectId>` |
| Project metadata | `TENANT#<tenantId>#PROJECT#<projectId>` | `META` |
| Project member | `TENANT#<tenantId>#PROJECT#<projectId>` | `MEMBER#<userId>` |
| Milestone | `TENANT#<tenantId>#PROJECT#<projectId>` | `MILESTONE#<milestoneId>` |
| Task | `TENANT#<tenantId>#PROJECT#<projectId>` | `TASK#<taskId>` |
| Risk | `TENANT#<tenantId>#PROJECT#<projectId>` | `RISK#<riskId>` |
| Report metadata | `TENANT#<tenantId>#PROJECT#<projectId>` | `REPORT#<createdAt>#<reportId>` |
| Connector summary | `TENANT#<tenantId>` | `CONNECTOR#<connectorId>` |
| Connector config | `TENANT#<tenantId>#CONNECTOR#<connectorId>` | `CONFIG` |
| Connector checkpoint | `TENANT#<tenantId>#CONNECTOR#<connectorId>` | `CHECKPOINT#<sourceId>` |
| Sync execution | `TENANT#<tenantId>#CONNECTOR#<connectorId>` | `SYNC#<startedAt>#<syncId>` |
| Source document | `TENANT#<tenantId>#CONNECTOR#<connectorId>` | `DOCUMENT#<canonicalHash>` |

### 2.3 GSI1 — User assignment and ownership

**Index name:** `gsi1-user-assignment`

| Use case | GSI1PK | GSI1SK |
|---|---|---|
| Task by assignee | `TENANT#<tenantId>#ASSIGNEE#<userId>` | `DUE#<yyyy-mm-dd>#STATUS#<status>#PROJECT#<projectId>#TASK#<taskId>` |
| Risk by owner | `TENANT#<tenantId>#RISK_OWNER#<userId>` | `REVIEW#<yyyy-mm-dd>#SEVERITY#<severity>#PROJECT#<projectId>#RISK#<riskId>` |
| Projects by program | `TENANT#<tenantId>#PROGRAM#<programId>` | `PROJECT#<status>#<projectNameNormalized>#<projectId>` |

### 2.4 GSI2 — Project entity status views

**Index name:** `gsi2-entity-status`

| Use case | GSI2PK | GSI2SK |
|---|---|---|
| Task by status | `TENANT#<tenantId>#PROJECT#<projectId>#TASK_STATUS#<status>` | `DUE#<yyyy-mm-dd>#PRIORITY#<priority>#TASK#<taskId>` |
| Risk by status | `TENANT#<tenantId>#PROJECT#<projectId>#RISK_STATUS#<status>` | `SEVERITY#<severityRank>#REVIEW#<yyyy-mm-dd>#RISK#<riskId>` |
| Connector by status | `TENANT#<tenantId>#CONNECTOR_STATUS#<status>` | `TYPE#<connectorType>#CONNECTOR#<connectorId>` |

**`severityRank` values:**

| Severity | Rank |
|---|---|
| critical | `01-critical` |
| high | `02-high` |
| medium | `03-medium` |
| low | `04-low` |

### 2.5 Access patterns

| ID | Access pattern | Operation |
|---|---|---|
| B01 | Get tenant | `GetItem` tenant `META` |
| B02 | Get user profile/membership | `Query` user PK |
| B03 | List projects for user | `Query` user PK, `begins_with(SK, PROJECT#)` |
| B04 | Get project | `GetItem` project `META` |
| B05 | List project members | `Query` project PK, `begins_with(SK, MEMBER#)` |
| B06 | List milestones | `Query` project PK, `begins_with(SK, MILESTONE#)` |
| B07 | Get task | `GetItem` project PK + task SK |
| B08 | List all project tasks | `Query` project PK, `begins_with(SK, TASK#)` |
| B09 | List tasks by status/due | `Query` GSI2 task-status partition |
| B10 | List my tasks | `Query` GSI1 assignee partition |
| B11 | List overdue tasks | `Query` GSI1/GSI2 with due-date upper bound and non-terminal statuses |
| B12 | List risks by status/severity | `Query` GSI2 risk-status partition |
| B13 | List reports by project | `Query` project PK, `begins_with(SK, REPORT#)` descending |
| B14 | List connectors | `Query` tenant PK, `begins_with(SK, CONNECTOR#)` |
| B15 | Get connector config/checkpoints | `Query` connector PK |
| B16 | List recent sync executions | `Query` connector PK, reverse order on `SYNC#` |
| B17 | Resolve source document | `GetItem` by connector PK + canonical hash |

**Không dùng `Scan` trong application request path.**

### 2.6 Conditional updates (Task)

```text
ConditionExpression:
  attribute_exists(PK)
  AND attribute_exists(SK)
  AND version = :expected_version

Update:
  SET ...,
      version = version + :one,
      updated_at = :now,
      updated_by = :user_id
```

Nếu condition fail → repository trả `entity_version_conflict`, không tự overwrite.

### 2.7 Denormalized membership writes

Thêm user vào project cần transactional write:
1. `ProjectMember` dưới project partition
2. `UserProjectEdge` dưới user partition

Xóa/disable membership phải cập nhật cả hai record bằng `TransactWriteItems`.

---

## 3. WorkflowState Table

### 3.1 Attribute definitions

| Attribute | Type |
|---|---|
| `PK` | String (partition key) |
| `SK` | String (sort key) |
| `GSI1PK` | String |
| `GSI1SK` | String |
| TTL attribute | `expires_at` (Number) |

### 3.2 Workflow partition key patterns

| Item | PK | SK |
|---|---|---|
| Workflow metadata | `WORKFLOW#<workflowId>` | `META` |
| Execution plan | `WORKFLOW#<workflowId>` | `PLAN#<planVersion>` |
| Agent task attempt | `WORKFLOW#<workflowId>` | `TASK#<taskId>#ATTEMPT#<nn>` |
| Workflow event | `WORKFLOW#<workflowId>` | `EVENT#<timestamp>#<eventId>` |
| Approval | `WORKFLOW#<workflowId>` | `APPROVAL#<approvalId>` |
| Citation | `WORKFLOW#<workflowId>` | `CITATION#<citationId>` |
| Artifact link | `WORKFLOW#<workflowId>` | `ARTIFACT#<artifactId>` |
| Conversation message | `WORKFLOW#<workflowId>` | `MESSAGE#<sequence>` |

**Quy tắc zero-padding:**
- Attempt number: `01`, `02`, ... (2 digits)
- Message sequence: `000001`, `000002`, ... (6 digits)

### 3.3 Lookup and projection items

| Item | PK | SK |
|---|---|---|
| Idempotency record | `IDEMPOTENCY#<tenantId>#<userId>#<keyHash>` | `REQUEST` |
| User workflow projection | `TENANT#<tenantId>#USER#<userId>` | `WORKFLOW#<createdAt>#<workflowId>` |
| Project workflow projection | `TENANT#<tenantId>#PROJECT#<projectId>` | `WORKFLOW#<createdAt>#<workflowId>` |
| Session metadata | `SESSION#<sessionId>` | `META` |
| Session workflow edge | `SESSION#<sessionId>` | `WORKFLOW#<createdAt>#<workflowId>` |

Projection items chứa safe summary để list page không phải fetch toàn bộ workflow partitions.

### 3.4 GSI1 — Operational workflow views

**Index name:** `gsi1-workflow-status`

| Use case | GSI1PK | GSI1SK |
|---|---|---|
| Workflow by status | `TENANT#<tenantId>#WORKFLOW_STATUS#<status>` | `UPDATED#<updatedAt>#WORKFLOW#<workflowId>` |
| Pending approval by user | `TENANT#<tenantId>#USER#<confirmerUserId>#PENDING_APPROVAL` | `EXPIRES#<expiresAtPadded>#WORKFLOW#<workflowId>#APPROVAL#<approvalId>` |

**`expiresAtPadded`:** epoch seconds zero-padded to 10 digits để sort đúng, ví dụ `001780000000`.

### 3.5 Access patterns

| ID | Access pattern | Operation |
|---|---|---|
| W01 | Create workflow exactly once | Transaction: idempotency + metadata + projections + event |
| W02 | Get workflow summary | `GetItem` workflow `META` |
| W03 | Get workflow detail/timeline | `Query` workflow partition with bounded pagination |
| W04 | List workflows for user | `Query` user projection partition |
| W05 | List workflows for project | `Query` project projection partition |
| W06 | List workflows by status | `Query` GSI1 status partition |
| W07 | List pending approvals for user | `Query` GSI1 pending-approval partition |
| W08 | Get agent task attempts | `Query` workflow partition by task prefix |
| W09 | Resume session | `Query` session partition |
| W10 | Resolve idempotency request | `GetItem` idempotency PK |

### 3.6 Workflow transition condition

```text
ConditionExpression:
  version = :expected_version
  AND #status IN (:allowed_status_1, :allowed_status_2)
```

Repository phải tạo expression hợp lệ từ allowlist cố định. Không nhận raw condition từ model hoặc request.

### 3.7 Workflow creation transaction

Một request mới tối thiểu ghi:
1. Idempotency record — condition `attribute_not_exists(PK)`
2. Workflow `META`
3. User workflow projection
4. Project workflow projection (nếu có)
5. Initial `workflow_created` event

Nếu idempotency record đã tồn tại:
- Cùng request hash → trả workflow hiện có
- Khác request hash → trả `409 idempotency_conflict`

### 3.8 TTL behavior

DynamoDB TTL là asynchronous. Authorization không được dựa vào việc expired item đã bị physical delete; code phải kiểm tra `expires_at` field.

---

## 4. Python Key Builders

Tất cả key patterns được implement trong `shared/models/keys.py`:

```python
from shared.models.keys import BusinessDataKeys, WorkflowStateKeys

# BusinessData
pk = BusinessDataKeys.tenant_pk("ten_01J")
pk, sk = BusinessDataKeys.task_gsi1("ten_01J", "usr_01J", "2026-07-24", "in_progress", "prj_01J", "tsk_01J")
pk, sk = BusinessDataKeys.task_gsi2("ten_01J", "prj_01J", "in_progress", "2026-07-24", "high", "tsk_01J")

# WorkflowState
pk = WorkflowStateKeys.workflow_pk("wf_01J")
pk, sk = WorkflowStateKeys.workflow_status_gsi1("ten_01J", "running", "2026-07-17T00:00:05Z", "wf_01J")
```

---

## 5. Repository Interfaces

Application code không gọi DynamoDB trực tiếp từ agents. Mọi access qua repository protocols trong `shared/models/repositories.py`:

```python
class TaskRepository(Protocol):
    def get(self, tenant_id: str, project_id: str, task_id: str) -> Task | None: ...
    def list_by_project(self, tenant_id: str, project_id: str) -> list[Task]: ...
    def list_by_assignee(self, tenant_id: str, user_id: str) -> list[Task]: ...
    def list_by_status(self, tenant_id: str, project_id: str, status: str) -> list[Task]: ...
    def list_overdue(self, tenant_id: str, project_id: str, as_of_date: date) -> list[Task]: ...
    def create(self, item: Task) -> Task: ...
    def update(self, item: Task, expected_version: int) -> Task: ...

class WorkflowRepository(Protocol):
    def get(self, tenant_id: str, workflow_id: str) -> Workflow | None: ...
    def list_by_status(self, tenant_id: str, status: str) -> list[Workflow]: ...
    def create_with_idempotency(self, workflow: Workflow, idempotency_record: dict) -> Workflow: ...
    def update_status(self, workflow_id: str, expected_version: int, new_status: str, allowed_statuses: list[str]) -> Workflow: ...
```

Repositories chịu trách nhiệm: key construction, serialization, conditional expressions, pagination cursor, transaction boundaries, domain error mapping, metrics/tracing.

---

## 6. Authorization Model

Mọi repository/tool operation thực hiện:
1. Tenant equality check
2. Entity belongs to authorized project
3. Required capability check
4. Entity status permits operation
5. Classification/ACL check (knowledge/artifact)
6. Approval validation (side effects)
7. Version/idempotency condition

`RequestContext` chỉ được tạo trong API/auth middleware từ verified identity và server-side membership. Không tin `tenant_id`, role hoặc permissions do frontend gửi lên.
