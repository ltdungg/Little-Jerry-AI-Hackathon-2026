# Tổng Quan Dự Án

## Mục Đích

NPO AI Platform là nền tảng quản lý dự án thông minh dành cho tổ chức phi lợi nhuận (NPO) tại Việt Nam. Hệ thống sử dụng AI đa agent để tự động hóa quản lý dự án, truyền thông nội bộ, lập báo cáo và hỗ trợ ra quyết định.

## Đối Tượng Người Dùng

| Vai Trò | Khả Năng Chính |
|---------|----------------|
| Lãnh đạo | Toàn quyền, phê duyệt, quản lý workflow |
| Quản lý dự án | Quản lý task, rủi ro, báo cáo |
| Thành viên nhóm | Đọc, tạo, cập nhật task |
| Tình nguyện viên | Chỉ đọc, cập nhật trạng thái |

## Ngôn Ngữ

Tất cả giao diện, chatbot, báo cáo đều hỗ trợ **tiếng Việt**.

## Công Nghệ Chính

- **Backend:** Python 3.12, aiohttp, LangGraph, Strands Agents
- **AI:** Amazon Bedrock (Nova Lite), RAG với Bedrock Knowledge Base
- **Database:** Amazon DynamoDB (single-table)
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS
- **Infra:** Terraform, Docker, GitHub Actions CI/CD
- **Tích hợp:** Jira (qua MCP Gateway), Slack, SharePoint

## Cấu Trúc Thư Mục

```
├── agents/          # 10 AI agents chuyên biệt
├── lambdas/         # Lambda functions (API, tools, ingestion)
├── shared/          # Mã nguồn Python chung
├── gateway/         # Schema công cụ MCP Gateway
├── frontend-reactjs/# Frontend React (Vite + TypeScript)
├── infra/           # Terraform infrastructure
├── fixtures/        # Dữ liệu seed demo
├── scripts/         # Script tiện ích
├── tests/           # Bộ kiểm thử
└── Makefile         # Build automation
```

## Bắt Đầu Nhanh

```bash
git clone <repo-url> && cd npo-ai-platform
uv sync                              # Cài dependencies
make test                            # Chạy unit tests
make build-images                    # Build Docker images
make deploy                          # Deploy lên AWS
```

## Tài Liệu Liên Quan

- [Kiến Trúc Hệ Thống](KIEN_TRUC_HE_THONG.md)
- [Hệ Thống Agent](HE_THONG_AGENT.md)
- [Tài Liệu API](TAI_LIEU_API.md)
- [Mô Hình Dữ Liệu](MO_HINH_DU_LIEU.md)
- [Hạ Tầng Terraform](HA_TANG_TERRAFORM.md)
- [Lambda Functions](LAMBDA_FUNCTIONS.md)
- [MCP Gateway](MCP_GATEWAY.md)
- [Frontend](FRONTEND.md)
- [Triển Khai CI/CD](TRIEN_KHAI.md)
- [Kiểm Thử](KIEM_THU.md)
- [Bảo Mật](BAO_MAT.md)
