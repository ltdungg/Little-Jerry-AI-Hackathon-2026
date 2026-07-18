# Institutional Memory Gap Analysis

> Phân tích khoảng cách giữa vision và hiện trạng codebase NPO AI Platform.
> Ngày: 2026-07-18

---

## 1. Vision

Hệ thống không chỉ lưu trữ thông tin thụ động mà sử dụng AI Agents để:

1. **Hiểu ngữ cảnh**: Trích xuất quyết định, action items, blockers và mối quan hệ giữa các công việc
2. **Institutional Memory**: Hình thành bộ nhớ tổ chức có thể tìm kiếm và truy vấn bằng ngôn ngữ tự nhiên
3. **Theo dõi tiến độ**: Liên tục giám sát tiến độ giữa các nhóm, phát hiện sớm rủi ro và phụ thuộc
4. **Cảnh báo chủ động**: Đưa ra cảnh báo và đề xuất hành động trước khi vấn đề xảy ra
5. **Tự động hóa báo cáo**: Tạo báo cáo định kỳ và theo yêu cầu
6. **Onboarding tình nguyện viên**: Hỗ trợ volunteer mới hòa nhập tổ chức
7. **Lưu giữ kiến thức bền vững**: Đảm bảo kiến thức tổ chức không phụ thuộc vào trí nhớ cá nhân

---

## 2. Kiến trúc hiện tại

```
User → Next.js 14 → Cognito → API Gateway → Lambda → Orchestrator Agent
                                                           │
                                               ┌───────────┼───────────┐───────────┐
                                               ▼           ▼           ▼           ▼
                                         Knowledge   Project&Task  Reporting  Communication
                                           Agent        Agent        Agent       Agent
                                               │           │           │           │
                                               ▼           ▼           ▼           ▼
                                         Bedrock KB   DynamoDB      S3        Slack Draft
```

**Agents hiện có (5):**

| Agent | File | Tools | Trạng thái |
|-------|------|-------|------------|
| Orchestrator | `agents/orchestrator/agent.py` | Delegate to 4 specialist agents + memory search/add | hoạt động, memory stub |
| Knowledge | `agents/knowledge/agent.py` | `search_organizational_knowledge`, `search_documents` | **placeholder** — trả về hardcoded response |
| Project & Task | `agents/project_task/agent.py` | `list_project_tasks`, `list_overdue_tasks`, `create_task`, `update_task` | hoạt động với DynamoDB |
| Reporting | `agents/reporting/agent.py` | `generate_report`, `store_report` | **placeholder** — trả về template |
| Communication | `agents/communication/agent.py` | `draft_message`, `send_notification` | **placeholder** — trả về template |

**Memory layer hiện tại:**
- `agents/common/memory/bedrock_agentcore_store.py` — Strands MemoryStore wrapper cho Bedrock AgentCore Memory API
- Orchestrator tích hợp MemoryManager với `search_memory` và `add` tools
- Memory được namespace theo session_id — cô lập giữa các phiên
- **Không có persistent institutional memory** — memory chỉ lưu conversation history, không extract structured knowledge

---

## 3. Phân tích gap theo từng Vision Goal

### 3.1 Hiểu ngữ cảnh: Trích xuất quyết định, action items, blockers, dependencies

**Trạng thái: Partial**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| Task entities | Task model với `status`, `priority`, `blocked_reason`, `related_risk_ids` | — |
| Task CRUD | `create_task`, `update_task` tools hoạt động | — |
| Decision extraction | — | Không có logic extract quyết định từ conversation |
| Action item extraction | — | Không có structured extraction sau mỗi conversation |
| Blocker detection | Field `blocked_reason` tồn tại trong data model | Không có AI detection — chỉ manual |
| Dependency graph | Field `related_risk_ids` trong Task | Không có cross-task dependency, no dependency model |

**Cần xây dựng:**
- Conversation post-processing agent extract decisions/action items/blockers
- Dependency entity model (task-to-task, task-to-milestone, cross-project)
- Structured extraction pipeline: conversation → LLM extraction → DynamoDB persistence

### 3.2 Institutional Memory có thể query bằng ngôn ngữ tự nhiên

**Trạng thái: Partial**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| Knowledge Base | Bedrock Knowledge Bases integration trong infrastructure | Knowledge agent tools là **placeholder** — chưa query thật |
| Document ingestion | Connector/SyncExecution/SourceDocument models đầy đủ trong data-model.md | Chưa có ingestion pipeline code |
| Conversation memory | `BedrockAgentCoreMemoryStore` — search/add conversations | Memory chỉ lưu raw messages, không structured |
| Natural language query | Orchestrator có `search_memory` tool | Memory search chỉ trả raw text, không có structured knowledge |

**Cần xây dựng:**
- Wire Knowledge Agent tools tới Bedrock Knowledge Base thật (bỏ placeholder)
- Structured memory entries: `{type: "decision", content: "...", context: "...", participants: [...], timestamp: "..."}`
- Memory indexing theo entity type (decisions, action items, blockers, risks)
- Query routing: natural language → structured query → memory search → response

### 3.3 Theo dõi tiến độ cross-group liên tục

**Trạng thái: Not Started**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| Task listing | `list_project_tasks`, `list_overdue_tasks` | — |
| Cross-team view | — | Không có unified dashboard cross-team |
| Continuous monitoring | — | Không có scheduled/polling mechanism |
| Progress tracking | Milestone model có `status` và `health` | Không có delta tracking (progress over time) |

**Cần xây dựng:**
- Monitoring agent hoặc scheduled Lambda: poll task/milestone status changes
- Cross-team progress model: team → tasks → completion % → timeline
- Event-driven updates: DynamoDB Streams → trigger progress calculation
- Progress snapshot entity: periodic snapshots cho trend analysis

### 3.4 Phát hiện rủi ro & phụ thuộc sớm, cảnh báo chủ động

**Trạng thái: Partial**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| Risk entity | Risk model với `likelihood`, `impact`, `score`, `severity` | — |
| Risk CRUD | Qua Project & Task agent (indirect) | Không có dedicated risk analysis tool |
| Proactive alerts | — | Không có push notification, không có scheduled scanning |
| Dependency detection | — | Không có dependency graph để detect cascading risks |
| Threshold alerts | Severity thresholds defined (low/medium/high/critical) | Không có threshold-based trigger logic |

**Cần xây dựng:**
- Risk Analysis Agent: scan tasks/milestones/risks → detect patterns → generate alerts
- Alert entity: `{alert_id, type, severity, message, related_entities, created_at, acknowledged_at}`
- Scheduled scanning: cron trigger → agent scan → push alert nếu threshold exceeded
- Dependency risk propagation: khi task A blocked → auto-flag dependent tasks B, C

### 3.5 Tự động tạo báo cáo

**Trạng thái: Solid (nhưng tools là placeholder)**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| Report entity | Report model đầy đủ trong data-model.md | — |
| Report Agent | `generate_report`, `store_report` tools | Tools là **placeholder** — chưa gen thật |
| Artifact storage | S3 artifact bucket model, `store_report_artifact` tool | — |
| Report types | `weekly_status`, `risk_summary`, `donor_report` | — |
| Scheduled reports | — | Không có cron/scheduled generation |

**Cần xây dựng:**
- Wire Report Agent tools tới DynamoDB queries + S3 storage thật
- Scheduled report generation (weekly, monthly)
- Report template engine: query real data → fill template → store artifact
- Report distribution: auto-send via Communication agent

### 3.6 Hỗ trợ onboarding volunteer mới

**Trạng thái: Not Started**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| User model | UserProfile, TenantMembership, ProjectMember | — |
| Role system | Roles: `npo_staff`, `project_manager`, `team_member`, `volunteer` | — |
| Onboarding flow | — | Không có onboarding module |
| Guided tour | — | Không có interactive guide |
| Knowledge surfacing | — | Không có role-based knowledge recommendation |

**Cần xây dựng:**
- Onboarding Agent: detect new volunteer → generate personalized onboarding plan
- Knowledge curator: based on role/team → surface relevant docs, policies, contacts
- Checklist generator: team-specific onboarding tasks
- Buddy system: match new volunteer with experienced team member
- Progress tracker: onboarding completion percentage

### 3.7 Lưu giữ kiến thức bền vững

**Trạng thái: Partial**

| Thành phần | Đã có | Thiếu |
|------------|-------|-------|
| Knowledge Base | Bedrock KB infrastructure | Knowledge Agent là placeholder |
| Document ingestion | Connector/SyncExecution models | Chưa có ingestion pipeline code |
| Decision log | — | Không có decision history entity |
| Why-this-decided | — | Không có rationale/context preservation |
| Knowledge evolution | — | Không có versioning cho organizational knowledge |

**Cần xây dựng:**
- Decision Log entity: `{decision_id, context, rationale, participants, alternatives_considered, outcome, related_entities}`
- Knowledge versioning: track when policies/decisions change and why
- Organizational context model: institutional history, past incidents, lessons learned
- Auto-ingestion: meetings/decisions → extract → persist → make searchable

---

## 4. Data Model Gap Analysis

### 4.1 Entities cần thêm

| Entity | Mục đích | Priority |
|--------|----------|----------|
| `Decision` | Lưu quyết định tổ chức với rationale | P0 |
| `ActionItem` | Extract từ conversations, track completion | P0 |
| `Blocker` | Detected blockers với impact analysis | P1 |
| `Dependency` | Cross-task/project dependencies | P1 |
| `Alert` | Proactive warnings cho users | P1 |
| `OnboardingChecklist` | Volunteer onboarding progress | P2 |
| `ProgressSnapshot` | Periodic progress snapshots cho trends | P2 |
| `KnowledgeVersion` | Version history cho organizational knowledge | P2 |
| `MeetingNote` | Extracted meeting notes với action items | P1 |

### 4.2 Entities hiện tại cần mở rộng

| Entity | Field cần thêm | Lý do |
|--------|----------------|-------|
| Task | `depends_on_task_ids: List[str]` | Cross-task dependencies |
| Task | `extracted_from_session_id: str` | Traceability về nguồn extract |
| ConversationSession | `decisions_extracted: bool` | Đánh dấu đã extract |
| ConversationSession | `extraction_summary: str` | Tóm tắt extracted content |
| Risk | `cascade_from_risk_ids: List[str]` | Risk propagation tracking |
| ProjectMember | `onboarding_status: str` | Onboarding progress |

### 4.3 Access Patterns cần thêm

| ID | Access pattern | Bảng |
|----|----------------|------|
| B18 | List decisions by project | BusinessData |
| B19 | List action items by assignee | BusinessData (GSI1) |
| B20 | List open blockers by project | BusinessData (GSI2) |
| B21 | List dependencies for task | BusinessData |
| B22 | List alerts by user/project | BusinessData |
| B23 | List meeting notes by project (date range) | BusinessData |

---

## 5. Agent Capability Gap Analysis

### 5.1 Agents hiện tại cần upgrade

| Agent | Gap | Khối lượng work |
|-------|-----|-----------------|
| Knowledge Agent | Tools là placeholder — cần wire với Bedrock KB thật | Medium |
| Reporting Agent | Tools là placeholder — cần query DynamoDB + generate thật | Medium |
| Communication Agent | Tools là placeholder — cần tích hợp Slack API thật | Medium |
| Orchestrator | Memory chỉ lưu raw messages — cần structured extraction | Medium |

### 5.2 Agents mới cần xây dựng

| Agent | Chức năng | Priority |
|-------|-----------|----------|
| **Memory Extraction Agent** | Post-conversation processing: extract decisions, action items, blockers từ conversation history | P0 |
| **Risk Analysis Agent** | Scan all tasks/risks/dependencies → detect patterns → generate proactive alerts | P1 |
| **Onboarding Agent** | Guide new volunteers: personalized plans, knowledge surfacing, buddy matching | P2 |
| **Monitoring Agent** | Continuous progress tracking across teams, delta calculation, trend analysis | P1 |

---

## 6. Infrastructure Gap Analysis

### 6.1 Đã có

| Component | Status |
|-----------|--------|
| Bedrock AgentCore Runtime | Terraform module hoạt động |
| Bedrock AgentCore Memory | Terraform module mới thêm (`infra/modules/agentcore-memory/`) |
| DynamoDB (BusinessData + WorkflowState) | Schema đầy đủ trong data-model.md |
| S3 (raw/curated/artifact) | Model đầy đủ |
| Bedrock Knowledge Bases | Infrastructure provisioned |

### 6.2 Cần xây dựng

| Component | Mục đích | Priority |
|-----------|----------|----------|
| DynamoDB Streams → Lambda | Event-driven triggers cho monitoring | P1 |
| EventBridge Scheduler | Cron triggers cho scheduled scanning/reports | P1 |
| SNS/SQS | Push notification cho alerts | P1 |
| Lambda (ingestion pipeline) | SharePoint/Slack → S3 → KB sync | P1 |
| Lambda (scheduled scanner) | Periodic risk/progress scanning | P1 |

---

## 7. Frontend Gap Analysis

### 7.1 Đã có

| Feature | Route |
|---------|-------|
| Dashboard | `/dashboard` |
| Projects | `/dashboard/projects/[id]` |
| Tasks | `/dashboard/projects/[id]/tasks` |
| Risks | `/dashboard/projects/[id]/risks` |
| Knowledge Q&A | `/dashboard/projects/[id]/knowledge` |
| Chat interface | Component `useChat` hook |

### 7.2 Cần xây dựng

| Feature | Mục đích | Priority |
|---------|----------|----------|
| Alert dashboard | View active alerts, acknowledge, filter | P1 |
| Onboarding wizard | Step-by-step onboarding cho new volunteers | P2 |
| Cross-team progress | Unified view across PM/Marketing/Operation teams | P1 |
| Decision log viewer | Browse organizational decisions với rationale | P1 |
| Dependency graph viz | Visualize task/project dependencies | P2 |

---

## 8. Recommended Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Wire Knowledge Agent tools với Bedrock Knowledge Base thật
- [ ] Wire Reporting Agent tools với DynamoDB queries thật
- [ ] Xây dựng Memory Extraction Agent: conversation → structured knowledge
- [ ] Thêm `Decision` và `ActionItem` entities vào data model + DynamoDB

### Phase 2: Intelligence (Week 3-4)
- [ ] Xây dựng Risk Analysis Agent: scan → detect → alert
- [ ] Thêm `Blocker`, `Dependency`, `Alert` entities
- [ ] Implement scheduled scanning (EventBridge + Lambda)
- [ ] Wire Communication Agent với Slack API thật

### Phase 3: Proactive (Week 5-6)
- [ ] Cross-team progress monitoring dashboard
- [ ] Proactive alert system (SNS/SQS + frontend alerts view)
- [ ] Dependency risk propagation
- [ ] Decision log viewer

### Phase 4: Onboarding & Knowledge (Week 7-8)
- [ ] Onboarding Agent với personalized plans
- [ ] Knowledge surfacing theo role/team
- [ ] Meeting note extraction pipeline
- [ ] Knowledge versioning và evolution tracking

---

## 9. Priority Summary

| Priority | Items | Impact |
|----------|-------|--------|
| **P0** | Wire placeholder agents thật, Memory Extraction Agent, Decision/ActionItem entities | Core functionality — không có thì hệ thống chỉ là shell |
| **P1** | Risk Analysis Agent, Alert system, Dependency model, Scheduled scanning, Cross-team monitoring | Proactive intelligence — tạo giá trị khác biệt |
| **P2** | Onboarding Agent, Knowledge versioning, Dependency graph viz, Meeting note extraction | Long-term sustainability — organizational knowledge preservation |

---

## 10. Conclusion

NPO AI Platform hiện tại có **nền tảng vững** (data model, agent architecture, infrastructure) nhưng phần lớn **intelligence layer còn ở mức placeholder**. Ba việc quan trọng nhất cần làm ngay:

1. **Bỏ placeholder**: Wire Knowledge/Reporting/Communication agents với data sources thật
2. **Thêm Memory Extraction**: Biến raw conversations thành structured institutional knowledge
3. **Thêm Proactive Monitoring**: Từ reactive (user hỏi mới trả lời) sang proactive (hệ thống tự cảnh báo)

Khi hoàn thành 3 việc này, hệ thống sẽ chuyển từ "chatbot tra cứu" sang "AI institutional memory" đúng như vision.
