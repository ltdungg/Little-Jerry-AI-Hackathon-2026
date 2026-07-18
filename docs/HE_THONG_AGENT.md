# Hệ Thống Agent

## Tổng Quan

10 AI agents chuyên biệt, mỗi agent chạy trên aiohttp server (port 8080) trong container Docker trên Amazon Bedrock AgentCore.

## Agent Chung

**Server chung** (`agents/common/server.py`): Mỗi agent có 2 endpoint — `GET /ping` (health check) và `POST /invocations` (nhận AgentTaskRequest, trả AgentTaskResult).

**Contracts**: Định nghĩa `AgentTaskRequest` (workflow_id, task_id, intent, instructions, inputs, constraints) và `AgentTaskResult` (status, summary, facts, citations, confidence).

**LLM Provider**: BedrockProvider gọi Amazon Bedrock Converse API (model mặc định: `amazon.nova-lite-v1:0`). Strands Model dùng cho Strands Agent framework.

**Clients**: BusinessDataClient (DynamoDB CRUD toàn diện), JiraMCPClient (xác thực Cognito JWT + gọi MCP tools), MCPClient (dynamic tool fetching).

**Auth**: Capability-based RBAC với 11 capabilities, 4 roles.

## Chi Tiết Từng Agent

### 1. Orchestrator (`agents/orchestrator/`)

**Framework:** LangGraph StateGraph
**Mô hình:** ReAct + Map-Reduce + Reflection

Luồng: `intent_router → planner → execute_workers → verifier → synthesizer`

- **Intent Router**: Phân loại câu hỏi, map đến target agent
- **Planner**: LLM tạo kế hoạch JSON (chỉ định nguồn dữ liệu cần truy vấn)
- **Workers**: Thực thi song song qua `asyncio.gather()` — gọi Jira, Slack, Knowledge Base, DynamoDB
- **Verifier**: Kiểm tra thông tin đủ chưa (tối đa 2 lần retry)
- **Synthesizer**: Tổng hợp câu trả lời tiếng Việt

Lưu ý: Greeting skip planner, đi thẳng synthesizer. Lỗi một worker không ảnh hưởng worker khác.

### 2. Intent Router (`agents/intent_router/`)

Phân loại 8 ý định: `JIRA_QUERY`, `JIRA_ACTION`, `SLACK_ACTION`, `RISK_CHECK`, `REPORT_GEN`, `KNOWLEDGE_SEARCH`, `MULTI_STEP`, `GREETING`.

Keyword matching nhanh (85% confidence), LLM fallback cho câu phức tạp (70% confidence).

### 3. Project Task (`agents/project_task/`)

**Framework:** Strands Agent + MCP Tools

Quản lý task Jira qua 5 MCP tools: `SearchIssues`, `GetAllBoards`, `createIssue`, `addComment`, `DoTransition`. System prompt yêu cầu luôn dùng tool, không tự tạo dữ liệu. Hiển thị tiếng Việt.

### 4. Knowledge (`agents/knowledge/`)

**Framework:** Strands Agent + Bedrock Knowledge Base (RAG)

2 tool: `search_organizational_knowledge` (RAG completa với citations) và `search_documents` (tìm chunk thô). Dùng Amazon Titan Embeddings + OpenSearch.

### 5. Reporting (`agents/reporting/`)

**Framework:** Strands Agent + DynamoDB + S3

Tạo 4 loại báo cáo: `daily_status`, `weekly_status`, `risk_summary`, `progress_summary`. Nội dung deterministic (không dùng LLM), dùng `shared/report_generators.py`. Lưu vào S3.

### 6. Communication (`agents/communication/`)

**Framework:** Strands Agent + Slack API

Đọc tin nhắn Slack (`conversations.history`) và gửi tin nhắn (`chat.postMessage`). Bot token lưu trong Secrets Manager.

### 7. Risk Analysis (`agents/risk_analysis/`)

**Framework:** Strands Agent + DynamoDB

4 tool phân tích deterministic (Python thuần):
- Phát hiện thành viên quá tải (3+ task overdue = high)
- Phân tích trend rủi ro (critical risks, high-risk clusters)
- Phát hiện dependency risks (blocked tasks, overdue milestones)
- Tổng hợp proactive alerts

### 8. Memory Extraction (`agents/memory_extraction/`)

**Framework:** Strands Agent + AgentCore Memory

4 tool: trích xuất quyết định, action items, blockers từ cuộc trò chuyện. Lưu vào AgentCore Memory (30-day retention).

### 9. Alert Manager (`agents/alert_manager/`)

Đánh giá mức độ cảnh báo từ Risk Analysis, quyết định thông báo người dùng. Quản lý escalation policy qua nhiều kênh.

### 10. Decision Tracker (`agents/decision_tracker/`)

Ghi lại quyết định từ cuộc họp, liên kết với action items, theo dõi thực hiện, audit trail.
