# Kiến Trúc Hệ Thống

## Tổng Quan

Hệ thống theo kiến trúc **microservices + multi-agent AI** trên AWS.

## Luồng Dữ Liệu Chính

**1. Người dùng đặt câu hỏi:**
React Frontend → API Gateway → API Lambda → DynamoDB + AgentCore Orchestrator → Intent Router → Planner → Workers (song song: Jira, Knowledge Base, Slack, DynamoDB) → Verifier → Synthesizer → Trả lời người dùng

**2. Tạo báo cáo tự động:**
EventBridge (cron 18:00 daily) → generate_daily_reports Lambda → DynamoDB (đọc data) → ReportGenerators (tạo Markdown) → S3 (lưu PDF) → DynamoDB (ghi metadata)

**3. Slack Bot:**
Slack Event → API Gateway → slack_receiver Lambda (xác thực chữ ký) → invoker Lambda → AgentCore Orchestrator → Trả lời qua Slack API

**4. Webhook Jira:**
Jira Webhook → jira_webhook Lambda → Cập nhật metrics DynamoDB → Phát hiện task overdue / priority escalation → Thông báo Slack

## Kiến Trúc Multi-Agent

10 agents phối hợp theo mô hình **hierarchical**:

- **Orchestrator** (LangGraph): Điều phối chính, gồm Intent Router → Planner → Workers → Verifier → Synthesizer
- **Intent Router**: Phân loại 8 loại ý định (Jira query, Slack, Risk check, Report, Knowledge search, Multi-step, Greeting, Unknown)
- **Project Task**: Quản lý task Jira qua MCP tools
- **Knowledge**: Tìm kiếm tri thức tổ chức (RAG)
- **Reporting**: Tạo báo cáo deterministic
- **Communication**: Giao tiếp Slack
- **Risk Analysis**: Phân tích rủi ro chủ động
- **Memory Extraction**: Trích xuất tri thức tổ chức
- **Alert Manager**: Quản lý cảnh báo
- **Decision Tracker**: Theo dõi quyết định

Agents gọi nhau qua HTTP (AgentCore Runtime) và chia sẻ tri thức qua Bedrock AgentCore Memory.

## Bảo Mật & Phân Quyền

- **Xác thực:** Amazon Cognito JWT tokens
- **Phân quyền RBAC 4 cấp:** Leader → Project Manager → Team Member → Volunteer
- **Mã hóa:** AES-256 (S3, ECR), TLS 1.2+ (transit)
- **Secrets:** AWS Secrets Manager (tokens, API keys)
- **Môi trường:** Dev / Staging / Prod riêng biệt
