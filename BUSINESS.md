# NPO AI Platform — Tài Liệu Giới Thiệu Dự Án

**Nền tảng AI đa tác tử — Trải nghiệm quản lý dự án thông minh cho tổ chức phi lợi nhuận**

---

## 1. Tóm Tắt Điều Hành (Executive Summary)

**NPO AI Platform** là nền tảng AI đa tác tử (multi-agent) đầu tiên tại Việt Nam được thiết kế đặc biệt cho tổ chức phi lợi nhuận (NPO). Hệ thống kết hợp **10 Agent AI chuyên biệt** hoạt động đồng thời, kết nối trực tiếp với Jira, Slack và Knowledge Base để tự động hóa toàn bộ quy trình quản lý dự án — từ truy vấn thông tin, tạo báo cáo, phân tích rủi ro, đến gửi tin nhắn nội bộ.

**Điều gì làm nền tảng này đặc biệt?**

> Không chỉ là một chatbot trả lời câu hỏi. Đây là một **hệ thống trí tuệ tổ chức** (Organizational Intelligence System) — hiểu biet mọi nguồn dữ liệu, nhớ mọi quyết định đã được ra, và tự động cảnh báo khi có vấn đề xảy ra. Đặc biệt giải quyết bài toán **tình nguyện viên ra vào liên tục** — mỗi lần có người rời đi, AI tự động bàn giao toàn bộ thông tin, đảm bảo không mất tri thức tổ chức.

**Công nghệ AI cốt lõi:**
- **Multi-Agent Architecture:** 10 AI agents phối hợp theo mô hình hierarchical — mỗi agent chuyên một lĩnh vực (quản lý task, tìm kiếm tri thức, phân tích rủi ro, giao tiếp, báo cáo) và được điều phối bởi Orchestrator Agent sử dụng **LangGraph StateGraph**
- **Retrieval-Augmented Generation (RAG):** Knowledge Agent sử dụng Amazon Bedrock Knowledge Base với Amazon Titan Embeddings + OpenSearch để tìm kiếm tri thức tổ chức theo ngữ nghĩa, trả lời kèm citation (trích dẫn nguồn tài liệu chính thức)
- **LLM Gateway:** Sử dụng Amazon Bedrock (model Nova Lite) cho reasoning, planning và synthesis — tất cả câu trả lời đều bằng tiếng Việt tự nhiên
- **MCP Protocol:** Kết nối AI agents với hệ thống bên ngoài (Jira, Slack) qua Model Context Protocol — một tiêu chuẩn mở cho phép AI gọi công cụ bên ngoài an toàn và đồng nhất
- **Institutional Memory:** Memory Extraction Agent tự động trích xuất quyết định, action items, blockers từ cuộc trò chuyện và lưu vào Amazon Bedrock AgentCore Memory (giữ lại 30 ngày)
- **Bàn giao tự động (Handoff):** Khi tình nguyện viên rời đi, hệ thống tự động discovery tasks, decisions, risks liên quan và tạo bản bàn giao chi tiết — giải quyết nỗi đau lớn nhất của NPO
- **No Hallucination Policy:** Tất cả câu trả lời đều dựa trên dữ liệu thực tế từ Jira, DynamoDB hoặc Knowledge Base — AI không bao giờ tự tạo dữ liệu

---

## 2. Mục Tiêu Đối Tượng Sử Dụng

### 2.1 Tổ Chức Mục Tiêu

| Loại tổ chức | Ví dụ | Nhu cầu chính |
|-------------|-------|---------------|
| **NPO tại Việt Nam** | Các tổ chức phi lợi nhuận, NGO, biên phòng | Quản lý đa dự án, đa phòng ban với nguồn lực hạn chế |
| **Cơ quan nhà nước** | Sở, cục, phòng chức năng | Tổng hợp báo cáo, quản lý chương trình |
| **Doanh nghiệp xã hội** | Social enterprise, Impact fund | Theo dõi tác động xã hội, báo cáo với nhà tài trợ |
| **Đơn vị giáo dục** | Trường học, học viện | Quản lý du học sinh, chương trình tình nguyện |

### 2.2 Đối Tượng Người Dùng

| Vai trò | Nhu cầu | Cách nền tảng hỗ trợ |
|---------|---------|---------------------|
| **Lãnh đạo tổ chức (Leader)** | Tổng quan toàn diện, quan sát real-time, ra quyết định nhanh | Dashboard tổng hợp, báo cáo tự động, cảnh báo rủi ro |
| **Quản lý dự án (Project Manager)** | Theo dõi tiến độ, điều phối nhân sự, xử lý ro rủ | Chat AI hỏi Jira, tạo báo cáo tự động, phân tích rủi ro |
| **Thành viên team (Team Member)** | Cập nhật tiến độ, báo cáo hàng ngày, truy vấn thông tin | Chat AI trả lời nhanh, gửi daily update, xem task |
| **Tình nguyện viên (Volunteer)** | Hiểu chính sách, quy trình, thực hiện công việc, bàn giao khi rời đi | Hỏi AI về chính sách, truy vấn tài liệu, hệ thống bàn giao tự động |

---

## 3. Mục Tiêu Của Hệ Thống

### 3.1 Mục Tiêu Chính

| Mục tiêu | Mô tả chi tiết |
|----------|---------------|
| **Tự động hóa** | Giảm 70% thời gian làm báo cáo thủ công — AI tự động thu thập dữ liệu từ Jira, DynamoDB, tạo nội dung Markdown/PDF |
| **Truy vấn** | Trả lời câu hỏi tổ chức trong 5 giây — chatbot AI hiểu ngữ cảnh tổ chức, trích dẫn nguồn tài liệu chính thức |
| **Cảnh báo** | Phát hiện rủi ro trước khi quá muộn — phân tích chủ động task overdue, risk trends, dependency risks |
| **Tri thức** | Không mất thông tin khi người đi — Institutional Memory ghi lại mọi quyết định, action items, blockers |
| **Phối hợp** | Kết nối Jira + Slack + Document — một nền tảng duy nhất thay vì nhiều công cụ rời rạc |

### 3.2 Mục Tiêu Đo Lường (KPIs)

| Chỉ số | Trước khi sử dụng | Sau khi sử dụng | Cải thiện |
|--------|-------------------|-----------------|-----------|
| Thời gian tạo báo cáo tuần | 3-4 giờ/người | 5 phút (tự động) | **95%** |
| Thời gian trả lời câu hỏi nội bộ | 2-4 giờ (email/Slack) | 5-10 giây (AI chat) | **99%** |
| Tỷ lệ phát hiện rủi ro sớm | 30% (thủ công) | 85% (tự động cảnh báo) | **183%** |
| Mất nguồn tri thức khi người đi | 60% thông tin mất | <5% (Institutional Memory) | **92%** |
| Số lượng báo cáo/tháng | 4 báo cáo (thủ công) | 30+ báo cáo (tự động) | **650%** |
| Thời gian onboarding người mới | 2-4 tuần | 3-5 ngày | **75%** |
| Thời gian bàn giao khi người rời đi | 3-5 ngày (thủ công) | 30 phút (AI auto-discovery) | **97%** |
| Thông tin mất sau khi bàn giao | 60% | <5% (Memory + Handoff history) | **92%** |

---

## 4. Mối Liên Kết (Integrations)

### 4.1 Mối Liên Kết Hiện Tại

```
                    ┌─────────────────────────┐
                    │    NPO AI PLATFORM       │
                    │    (AI Multi-Agent)      │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌───────────┐ ┌─────────────┐
     │    JIRA      │ │   SLACK   │ │  KNOWLEDGE  │
     │  (Tasks)     │ │ (Chat)    │ │   BASE      │
     │  Source of   │ │ Internal  │ │ Documents,  │
     │  Truth       │ │ Comms     │ │ Policies    │
     └──────────────┘ └───────────┘ └─────────────┘
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌───────────┐ ┌─────────────┐
     │  MCP Gateway │ │  MCP      │ │  Bedrock    │
     │  (AgentCore) │ │  Gateway  │ │  RAG + Emb  │
     └──────────────┘ └───────────┘ └─────────────┘
```

### 4.2 Khái Niệm MCP Gateway — "Một Cửa Số Kết Nối"

NPO AI Platform sử dụng **Model Context Protocol (MCP)** — một tiêu chuẩn mở cho phép AI kết nối an toàn với các hệ thống bên ngoài. Thay vì phải viết riêng API cho mỗi dịch vụ, MCP Gateway **đồng nhất hóa** cách kết nối:

| Dịch vụ | Phương thức kết nối | Loại thông tin |
|---------|---------------------|----------------|
| **Jira** | MCP Gateway → Streamable HTTP | Tasks, boards, transitions, comments |
| **Slack** | MCP Gateway → Streamable HTTP | Tin nhắn, channels, gửi draft |
| **Knowledge Base** | Bedrock Retrieve & Generate | Documents, policies, quy trình |
| **DynamoDB** | AWS SDK (boto3) | Dữ liệu app: projects, risks, reports |

**Lợi ích của MCP Gateway:**
- **Thêm dịch vụ mới** chỉ cần thêm MCP target, không cần sửa code agent
- **Bảo mật:** JWT authentication, token caching, auto-refresh
- **Semantic Search:** Gateway hỗ trợ tìm kiếm theo nghĩa (không chỉ keyword)

### 4.3 Mối Liên Kết Dự Kiến (Roadmap)

| Giai đoạn | Tích hợp | Giá trị |
|-----------|---------|---------|
| **Phase 1** (Hiện tại) | Jira, Slack, Bedrock KB | Quản lý task + truy vấn tri thức |
| **Phase 2** | Google Calendar, Outlook | Tự động tạo cuộc họp, nhắc lịch |
| **Phase 3** | Google Drive, OneDrive | Trực tiếp truy vấn file mà không cần upload |
| **Phase 4** | Email (SMTP) | Gửi báo cáo tự động qua email |
| **Phase 5** | WhatsApp, Zalo | Liên lạc với người dùng cuối (beneficiaries) |

---

## 5. Lợi Ích — Tại Sao Chọn NPO AI Platform?

### 5.1 Lợi Ích Về Năng Suất (Productivity)

**Trước khi sử dụng:**
- Lãnh đạo gửi tin nhắn "Ai làm báo cáo tuần?"
- PM thu thập dữ liệu 2 giờ
- Viết báo cáo 2 giờ
- Gửi email cho lãnh đạo 30 phút
- **Tổng: 4.5 giờ**

**Sau khi sử dụng:**
- PM nhập "Tạo báo cáo tuần cho Green Hope"
- AI tự động lấy dữ liệu từ Jira
- AI phân tích rủi ro từ DynamoDB
- AI tạo báo cáo Markdown + PDF
- **Tổng: 5 phút**

**Tiết kiệm: 4.5 giờ/người/tuần = 234 giờ/năm = 29 ngày làm việc/năm được giải phóng**

### 5.2 Lợi Ích Về Hiệu Quả (Efficiency)

| Khả năng | Mô tả | Hiệu quả |
|----------|-------|----------|
| **Chat AI nội bộ** | Bất kỳ ai trong tổ chức có thể hỏi AI về chính sách, quy trình | Giảm 90% email/Slack hỏi đáp trùng lặp |
| **Cảnh báo tự động** | AI phát hiện task quá hạn, rủi ro chưa xử lý | Xử lý vấn đề trước khi trở thành khủng hoảng |
| **Báo cáo đa phòng ban** | Mỗi team tự động gửi báo cáo, lãnh đạo nhìn tổng quan | Không cần "nhắc nhau mỗi tuần" |
| **Tri thức tổ chức** | Mọi quyết định, action item được ghi nhớ | Không mất thông tin khi người đi |

### 5.3 Lợi Ích Về Đa Phòng Ban (Cross-Department)

Vấn đề lớn nhất của NPO: **mỗi phòng ban dùng một công cụ khác nhau** — Chương trình dùng Jira, Tài chính dùng Excel, Nhân sự dùng Google Sheet, Truyền thông dùng Slack. Kết quả: dữ liệu rời rạc, không ai thấy bức tranh toàn cảnh.

NPO AI Platform giải quyết bằng cách **kết nối tất cả công cụ hiện có** qua MCP Gateway và trở thành **lớp tri thức chung** — mỗi phòng ban vẫn dùng công cụ quen thuộc, nhưng AI tổng hợp dữ liệu từ mọi nguồn.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PHÒNG CHƯƠNG TRÌNH        PHÒNG TÀI CHÍNH                    │
│   Công cụ: Jira             Công cụ: Excel/Google Sheet        │
│   → Quản lý task, milestone → Báo cáo ngân sách, chi phí       │
│          │                           │                          │
│          └──────────┬────────────────┘                          │
│                     │  MCP Gateway kết nối                      │
│                     ▼                                           │
│          ┌─────────────────────┐                                │
│          │  NPO AI PLATFORM    │                                │
│          │  Tổng hợp + AI      │                                │
│          └──────────┬──────────┘                                │
│                     │                                           │
│          ┌──────────┴────────────────┐                          │
│          │                           │                          │
│          ▼                           ▼                          │
│   PHÒNG NHÂN SỰ              PHÒNG TRUYỀN THÔNG               │
│   Công cụ: Google Sheet      Công cụ: Slack                    │
│   → Onboarding, bàn giao     → Tin nhắn, báo cáo truyền thông  │
│                                                                 │
│   → TẤT CẢ CÙNG CHIA SẺ MỘT NỀN TẢNG TRÍ THỨC CHUNG          │
└─────────────────────────────────────────────────────────────────┘
```

**Mỗi phòng ban được gì cụ thể:**

| Phòng ban | Công cụ hiện tại | Lợi ích khi dùng NPO AI Platform |
|-----------|------------------|----------------------------------|
| **Chương trình** | Jira | Chat AI hỏi "Task nào overdue của Green Hope?" — trả lời trong 5 giây thay vì mở Jira filter thủ công. AI tự động cảnh báo khi milestone sắp hết hạn |
| **Tài chính** | Excel/Sheet | Chat AI hỏi "Tổng chi phí Q2 của Ocean Rescue?" — AI tổng hợp từ nhiều nguồn, không cần download file rồi SUM thủ công. Báo cáo tự động gửi nhà tài trợ |
| **Nhân sự** | Google Sheet | Onboarding tự động cho tình nguyện viên mới — AI giới thiệu chính sách, quy trình, checklist. Bàn giao khi người rời đi — không mất thông tin |
| **Truyền thông** | Slack | AI đọc tin nhắn Slack, tóm tắt cuộc họp, tạo draft tin nhắn. Gửi thông báo tự động khi có issue mới hoặc task overdue |
| **Lãnh đạo** | Nhiều nguồn | Dashboard tổng hợp TẤT CẢ phòng ban trên một giao diện. Chat AI hỏi bất kỳ câu hỏi nào — AI trả lời bằng dữ liệu từ mọi nguồn |

**Ví dụ thực tế:**
```
Lãnh đạo: "Tình hình dự án Green Hope tháng này thế nào?"

AI (tổng hợp từ Jira + DynamoDB + Slack):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dự án Green Hope — Tháng 7/2026

📊 Tiến độ (từ Jira):
   - 12/15 task đã hoàn thành (80%)
   - 2 task overdue, 1 task đang chờ phê duyệt

⚠️ Rủi ro (từ DynamoDB):
   - HIGH: Thiếu hụt tình nguyện viên (3 người rời đi tuần trước)
   - MEDIUM: Ngân sách Q3 chưa được giải ngân

💬 Hoạt động nội bộ (từ Slack):
   - Cuộc họp standup 15/7: Đã phân công lại tasks
   - Nguyễn Văn A báo bận đến 20/7

📅 Milestone sắp tới:
   - 25/7: Hoàn thành trồng 500 cây ngập mặn (70%)

Nguồn: [Jira board Green Hope], [DynamoDB risks], [Slack #green-hope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

→ **Lãnh đạo không cần hỏi 4 phòng ban** — AI tổng hợp tất cả trong 5 giây.

### 5.4 Lợi Ích Về Bảo Mật & Tự Chủ (Security & Autonomy)

| Tính năng | Mô tả |
|-----------|-------|
| **RBAC (4 vai trò)** | Leader → Project Manager → Team Member → Volunteer, mỗi vai trò có quyền riêng |
| **Human-in-the-Loop** | Mọi hành động quan trọng đều cần người xác nhận trước khi thực thi (propose/commit pattern) |
| **Audit Logging** | Mọi thao tác được ghi nhật ký, truy xuất được — ai làm gì, khi nào, ở đâu |
| **KMS Encryption** | Dữ liệu mã hóa bằng Customer Managed Key, cả at rest lẫn in transit |
| **No Hallucination Policy** | AI KHÔNG BAO GIỜ bịa dữ liệu — chỉ trả lời từ nguồn chính thức (Jira, DynamoDB, Knowledge Base) |
| **Cognito Authentication** | Xác thực JWT tokens, token caching, auto-refresh |

### 5.5 Lợi Ích Về Chi Phí (Cost)

| Khoản mục | Chi phí ước tính/tháng | Ghi chú |
|-----------|------------------------|---------|
| AWS Bedrock (LLM) | $50-150 | Nova Lite, pay-per-use |
| AWS DynamoDB | $25-50 | On-demand pricing |
| AWS S3 | $5-10 | Low storage + transfer |
| AWS Lambda | $10-30 | Serverless, chỉ trả khi sử dụng |
| AgentCore Runtime | $50-100 | 10 agents, pay-per-invocation |
| **Tổng** | **$140-340/tháng** | **Cho tổ chức nhỏ-trung bình** |

> **So sánh**: Một nhân viên PM toàn thời gian lương $500-800/tháng chỉ làm báo cáo + quản lý task. NPO AI Platform **thay thế 60-80% công việc lặp đi lặp lại** với chi phí $140-340/tháng.

---

## 6. Các Tính Năng Nổi Bật Để Gây Ấn Tượng

### 6.1 Chat AI Nội Bộ — "Hỏi Gì Cũng Được"

```
Người dùng: "Chính sách mua sắm của tổ chức quy định gì về đơn hàng trên 500 USD?"

AI (trả lời trong 5 giây):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dựa trên tài liệu "Procurement Policy v2.1":

Tất đơn hàng vượt 500 USD cần:
1. Phê duyệt cấp 1: Quản lý dự án
2. Phê duyệt cấp 2: Phó Giám đốc tài chính
3. Upload hóa đơn + chứng từ hỗ trợ

Thời gian xử lý tiêu chuẩn: 3-5 ngày làm việc.

Nguồn: [Procurement Policy v2.1, Section 4.2]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Đặc biệt**: Mỗi câu trả lời đi kèm **citation** (nguồn tài liệu chính thức) — đảm bảo AI không bịa đặt.

**Công nghệ AI đằng sau:**
- **RAG Pipeline:** Query → Amazon Titan Embedding → OpenSearch semantic search → Retrieve top chunks → Nova Lite generate answer with citations
- **Knowledge Base:** Tất cả tài liệu tổ chức (chính sách, quy trình, handbooks) được ingest vào Bedrock Knowledge Base, vectorized và indexed
- **Grounding:** Mỗi câu trả lời đều được grounding bằng dữ liệu thực, không dùng general knowledge

### 6.2 Phân Tích Rủi Ro Tự Động — "Thấy Trước Khi Quá Muộn"

```
┌──────────────────────────────────────────────┐
│  CẢNH BÁO RỦI RO — 2026-01-15               │
│                                              │
│  CRITICAL                                    │
│  Milestone "Phase 2 Rollout" đã quá hạn     │
│  (hạn: 2026-01-10, đã trễ 5 ngày)          │
│                                              │
│  HIGH                                        │
│  Thành viên Nguyễn Văn A có 4 task quá hạn  │
│  → Có thể bị quá tải, cần hỗ trợ           │
│                                              │
│  MEDIUM                                      │
│  Có 3 rủi ro CHƯA CÓ giải pháp giảm thiểu   │
│  → Cần phân bổ chủ sở hữu                   │
│                                              │
│  [Xem chi tiết]  [Điều phối nhân sự]        │
└──────────────────────────────────────────────┘
```

**Công nghệ AI đằng sau:**
- **Risk Analysis Agent:** Sử dụng 4 tool phân tích deterministic (Python thuần, không dùng LLM) — phân tích pattern task overdue, trend rủi ro, dependency risks, và tổng hợp proactive alerts
- **Severity Scoring:** Tự động tính điểm rủi ro = likelihood × impact, phân loại low/medium/high/critical
- **Proactive Alerts:** Không cần người dùng hỏi — hệ thống tự động scan và cảnh báo khi phát hiện vấn đề

### 6.3 Báo Cáo Tự Động — "5 Phút Thay Vì 5 Giờ"

AI tự động tạo 4 loại báo cáo:
- **Báo cáo ngày:** Chỉ những gì thay đổi trong 24h qua
- **Báo cáo tổng quan:** Task + Rủi ro + Milestone
- **Báo cáo rủi ro:** Phân tích chi tiết từng rủi ro theo mức độ
- **Báo cáo tiến độ:** So sánh kế hoạch vs thực tế

Tất cả được tạo từ **dữ liệu thực tế** (không phải LLM hallucination), xuất dưới dạng **Markdown + PDF** chuyên nghiệp.

**Công nghệ AI đằng sau:**
- **Deterministic Report Generation:** Sử dụng `shared/report_generators.py` — pure Python logic, không gọi LLM cho việc tạo nội dung. Đọc dữ liệu từ DynamoDB, format thành Markdown
- **EventBridge Scheduler:** Cron `0 11 * * ? *` UTC (18:00 VN) tự động trigger report generation hàng ngày
- **Idempotency Guard:** Nếu báo cáo đã tồn tại cho cùng project + category + period_end, hệ thống skip — tránh tạo trùng
- **PDF Rendering:** WeasyPrint chuyển Markdown → HTML → PDF với styling chuyên nghiệp, lưu lên S3

### 6.4 Institutional Memory — "Nhớ Mọi Quyết Định"

```
Cuộc họp hôm nay:
  Quyết định: Chuyển đổi công nghệ từ React sang Vue
  Lý do: Nhóm dev Vue đã có sẵn, giảm chi phí tuyển dụng
  Người tham gia: PM An, Tech Lead Bình, Lãnh đạo Cường
  
  → AI tự động lưu vào Memory
  
Sau 6 tháng, người mới đến hỏi:
  "Tại sao sử dụng Vue thay vì React?"
  
  → AI trả lời: "Theo quyết định ngày 2026-01-15, tổ chức
     đã chọn Vue vì..."
```

**Công nghệ AI đằng sau:**
- **Memory Extraction Agent:** Sử dụng Strands Agent với 4 tool — extract_decisions, extract_action_items, extract_blockers, store_memory_entry
- **AgentCore Memory Store:** Lưu trữ tri thức tổ chức trong Amazon Bedrock AgentCore Memory với 30-day retention, persistent across sessions
- **Conversation Processing:** Agent phân tích text cuộc họp/cuộc trò chuyện, tự động nhận diện quyết định, action items và blockers

### 6.5 Multi-Agent Orchestration — "10 Agents Phối Hợp"

```
                    ┌──────────────────┐
                    │   ORCHESTRATOR   │
                    │   (LangGraph)    │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Project Task  │  │   Knowledge   │  │Communication  │
│    Agent      │  │    Agent      │  │    Agent      │
│ (Jira Tasks)  │  │  (RAG Search) │  │ (Slack Chat)  │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Reporting    │  │Risk Analysis  │  │    Memory     │
│    Agent      │  │    Agent      │  │  Extraction   │
│ (PDF Reports) │  │(Proactive)    │  │  (Decisions)  │
└───────────────┘  └───────────────┘  └───────────────┘
```

**Công nghệ AI đằng sau:**
- **LangGraph StateGraph:** Orchestrator sử dụng mô hình ReAct + Map-Reduce + Reflection — Intent Router phân loại → Planner tạo kế hoạch → Workers thực thi song song → Verifier kiểm tra → Synthesizer tổng hợp
- **Parallel Execution:** Workers chạy đồng thời qua `asyncio.gather()` — gọi Jira, Knowledge Base, Slack, DynamoDB cùng lúc
- **Fault Isolation:** Lỗi một agent không ảnh hưởng agents khác — mỗi worker có try-catch riêng
- **Retry Logic:** Verifier tự động kiểm tra thông tin có đủ không, nếu thiếu thì retry planner tối đa 2 lần

### 6.6 Bàn Giao & Offboarding — "Người Đi, Thông Tin Không Mất"

Đây là **nỗi đau lớn nhất của NPO**: tình nguyện viên ra vào liên tục, mỗi lần có người rời đi là mất hàng tuần để bàn giao — rồi vẫn sót thông tin. NPO AI Platform giải quyết bằng hệ thống **bàn giao tự động có AI hỗ trợ**.

**Vấn đề thực tế:**
```
┌──────────────────────────────────────────────────────────────┐
│  TRƯỚC KHI SỬ DỤNG:                                         │
│                                                              │
│  Tình nguyện viên Linh rời đi:                               │
│  - PM phải họp 2h để bàn giao tasks                          │
│  - Viết email 30 phút mô tả lại công việc                   │
│  - Linh gửi file qua Google Drive (10GB, không rõ file nào) │
│  - 2 tháng sau, người mới hỏi "Quy trình này ai làm?"     │
│  → Không ai nhớ, phải làm lại từ đầu                        │
│                                                              │
│  → TỔNG: 3-5 ngày bàn giao, vẫn mất 60% thông tin          │
└──────────────────────────────────────────────────────────────┘
```

**NPO AI Platform giải quyết:**
```
┌──────────────────────────────────────────────────────────────┐
│  SAU KHI SỬ DỤNG:                                           │
│                                                              │
│  PM tạo bàn giao trên hệ thống:                              │
│  - Chọn người rời đi (Linh) + người nhận (Hùng)            │
│  - Hệ thống tự động liệt kê:                                │
│    ✓ 8 tasks Linh đang phụ trách                            │
│    ✓ 3 quyết định Linh đã tham gia                          │
│    ✓ 2 rủi ro Linh đang quản lý                             │
│    ✓ Tài liệu Linh upload trong 6 tháng qua                 │
│                                                              │
│  AI tạo bản bàn giao chi tiết:                              │
│  "Linh đang phụ trách task 'Tuyển dụng tình nguyện viên     │
│   đợt 3' (overdue 2 ngày), task 'Soạn nội dung training'   │
│   (hoàn thành 80%). Quyết định ngày 15/7: Chọn nhà cung    │
│   cấp giống B thay vì A (Linh là người đề xuất)."          │
│                                                              │
│  Hùng xác nhận từng mục, AI lưu vào Memory                  │
│  → 6 tháng sau, người mới hỏi → AI trả lời ngay            │
│                                                              │
│  → TỔNG: 30 phút bàn giao, mất <5% thông tin               │
└──────────────────────────────────────────────────────────────┘
```

**Công nghệ AI đằng sau:**
- **Auto-discovery:** Khi tạo handoff, hệ thống tự động query DynamoDB tìm tất cả tasks, risks, decisions, documents liên quan đến người rời đi — không cần nhớ thủ công
- **AI-generated summary:** Orchestrator Agent tạo bản tóm tắt chi tiết bằng tiếng Việt cho từng mục cần bàn giao
- **Confirmation workflow:** Người nhận xác nhận từng mục (confirm/reject), đảm bảo không bỏ sót
- **Offboarding automation:** Tự động thu hồi quyền truy cập (Cognito groups), cập nhật audit log
- **Institutional Memory:** Sau khi bàn giao, mọi thông tin vẫn lưu trong Memory — người mới có thể hỏi AI bất kỳ lúc nào

**Tính năng cụ thể:**

| Tính năng | Mô tả |
|-----------|-------|
| **Handoff Creation** | PM tạo bàn giao, chọn người rời đi + người nhận |
| **Auto Task Discovery** | Hệ thống tự động tìm tasks, risks, decisions liên quan |
| **AI Summary** | AI tạo bản tóm tắt chi tiết bằng tiếng Việt |
| **Confirm/Reject** | Người nhận xác nhận từng mục, reject nếu cần giải thích thêm |
| **Offboarding Checklist** | Checklist tự động: thu hồi quyền, cập nhật thông tin liên hệ |
| **Handoff History** | Lưu trữ lịch sử bàn giao, truy vấn bất kỳ lúc nào |

---

## 7. Đối Thủ Cạnh Tranh & Vị Trí Hóa

### 7.1 So Sánh Với Các Giải Pháp Khác

| Tiêu chí | NPO AI Platform | ChatGPT/Custom GPT | PM Tools (Jira, Asana) | BI Tools (PowerBI) |
|----------|-----------------|--------------------|-----------------------|---------------------|
| **Đầu nối Jira** | MCP (real-time) | Không (cần export) | Native | Cần connector |
| **Đầu nối Slack** | MCP (real-time) | Không | Limited | Không |
| **Knowledge Base** | RAG + Citation | Không (chỉ general) | Không | Không |
| **Phân tích rủi ro** | Tự động, chủ động | Cần prompt thủ công | Cơ bản | Có (nhưng thủ công) |
| **Báo cáo tự động** | 4 loại, deterministic | General text | Limited | Có (nhưng cần setup) |
| **Tri thức tổ chức** | Memory + Extraction | Không | Không | Không |
| **Bàn giao (Handoff)** | Auto-discovery + AI summary | Không | Không | Không |
| **Bảo mật (RBAC)** | 4 roles, audit log | Không | Có | Có |
| **Ngôn ngữ Việt** | Native | Good | Limited | Limited |
| **Chi phí** | $140-340/tháng | $20-200/tháng | $50-500/tháng | $100-500/tháng |
| **Phù hợp NPO** | **Thiết kế riêng** | Không | Không | Không |

### 7.2 Lợi Thế Cạnh Tranh

1. **Duy nhất:** Không có sản phẩm nào ở Việt Nam thiết kế riêng cho NPO với AI multi-agent
2. **Tích hợp sâu:** MCP Gateway cho phép kết nối Jira + Slack + Document mà không cần viết riêng API
3. **Bảo mật:** Human-in-the-Loop — mọi hành động quan trọng đều cần người xác nhận
4. **Tri thức tổ chức:** Institutional Memory — không mất thông tin khi người đi
5. **Bàn giao thông minh:** Auto-discovery + AI summary — tình nguyện viên rời đi không còn là vấn đề
6. **Ngôn ngữ Việt:** Mọi câu trả lời, báo cáo đều bằng tiếng Việt tự nhiên
7. **Chi phí thấp:** Serverless architecture, chỉ trả khi sử dụng

---

## 8. Roadmap Phát Triển

### Phase 1: Core Platform (Hiện tại)
- [x] 10 AI Agent hoạt động (Orchestrator, Intent Router, Project Task, Knowledge, Reporting, Communication, Risk Analysis, Memory Extraction, Alert Manager, Decision Tracker)
- [x] Jira MCP integration (real-time task sync)
- [x] Slack MCP integration (read + send messages)
- [x] Bedrock Knowledge Base (RAG with citations)
- [x] 80+ REST API endpoints
- [x] React 19 frontend (Vite + TypeScript + Tailwind)
- [x] Terraform IaC (12+ modules)
- [x] CI/CD (GitHub Actions)
- [x] 4 loại báo cáo tự động (daily, weekly, risk, progress)
- [x] Risk analysis engine (4 tool phân tích deterministic)
- [x] Institutional Memory (Bedrock AgentCore Memory)
- [x] RBAC 4 cấp (Leader, PM, Team Member, Volunteer)
- [x] PDF export (WeasyPrint)
- [x] Webhook Jira (issue tracking + metrics)
- [x] Handoff & Offboarding (bàn giao tự động, auto-discovery, checklist)
- [x] Onboarding (nội dung, checklist, vai trò)

### Phase 2: Enhanced Intelligence (Q3 2026)
- [ ] Google Calendar integration — tạo cuộc họp tự động
- [ ] Email integration — gửi báo cáo qua email
- [ ] Multi-language support (English, French)
- [ ] Voice input (speech-to-text)
- [ ] Advanced analytics dashboard
- [ ] Custom agent builder (no-code)

### Phase 3: Ecosystem Expansion (Q4 2026)
- [ ] Google Drive / OneDrive direct access
- [ ] Mobile app (React Native)
- [ ] Offline mode (PWA)
- [ ] API marketplace for third-party integrations

### Phase 4: Enterprise Scale (2027)
- [ ] Multi-tenant SaaS platform
- [ ] White-label solution cho NPO khác
- [ ] Advanced compliance (GDPR, Vietnamese data laws)
- [ ] Federated learning (không chia sẻ dữ liệu)
- [ ] Industry-specific templates (Giáo dục, Y tế, Môi trường)

---

## 9. Đội Ngũ & Công Nghệ

### Đội Ngũ Phát Triển

| Vị trí | Số lượng | Nhiệm vụ |
|--------|----------|----------|
| AI/ML Engineer | 2-3 | Agent development, prompt engineering, evaluation |
| Backend Engineer | 2 | API, Lambda, DynamoDB, integrations |
| Frontend Engineer | 1-2 | React UI/UX |
| DevOps/Infra | 1 | Terraform, CI/CD, monitoring |
| Product/Domain | 1-2 | NPO domain expert, user research |

### Stack Kỹ Thuật

| Lớp | Công Nghệ | Chi Tiết |
|-----|-----------|---------|
| AI/Agent | Python 3.12, LangGraph, Strands Agents | Multi-agent orchestration, RAG, memory |
| LLM | Amazon Bedrock (Nova Lite) | Reasoning, planning, synthesis |
| Knowledge | Bedrock Knowledge Base + OpenSearch | Vector search, semantic retrieval |
| Backend | aiohttp, Lambda, DynamoDB, S3 | Serverless API, single-table design |
| Frontend | React 19, Vite, TypeScript, Tailwind | SPA with auth (Amplify/Cognito) |
| Infra | Terraform, AWS (AgentCore, Bedrock, Cognito, ECR) | IaC, containerized deployments |
| Integration | MCP Protocol, Jira API, Slack API | Standardized tool calling |
| CI/CD | GitHub Actions, Docker (ARM64) | Automated build, test, deploy |

---

## 10. Cam Kết Với NPO

### Nguyên Tắc Cốt Lõi

1. **AI phục vụ con người** — Không thay thế người, mà giúp người làm việc hiệu quả hơn
2. **Bảo mật là tiền đề** — Mọi hành động AI đều cần người xác nhận trước khi thực thi
3. **Không hallucination** — AI chỉ trả lời dựa trên dữ liệu thực, không bao giờ bịa đặt
4. **Chi phí bền vững** — Serverless, chỉ trả khi sử dụng, phù hợp ngân sách NPO
5. **Tri thức là tài sản** — Mọi quyết định, mọi thông tin đều được ghi nhớ và truy vấn được

### Lời Hứa

> "Chúng tôi tin rằng mọi tổ chức phi lợi nhuận xứng đáng một hệ thống quản lý thông minh — không phải chỉ những công ty lớn mới có AI."

NPO AI Platform được xây dựng với tâm gương **dành riêng cho NPO**: giảm thời gian làm việc lặp, tăng năng lực phân tích, bảo vệ tri thức tổ chức, và giúp mọi người tập trung vào **con người** — điều quan trọng nhất.

---

## 11. Liên Hệ

| Thông tin | Giá trị |
|-----------|---------|
| GitHub | `github.com/ltdungg/Little-Jerry-AI-Hackathon-2026` |
| Region | `ap-southeast-2` (Sydney) |
| Stack | AWS Bedrock AgentCore + LangGraph + Strands |
| Ngôn ngữ | Python 3.12 + TypeScript |

---

**NPO AI Platform** — *Trao Quyền Cho Tổ Chức Phi Lợi Nhuận Với Trí Tuệ Dự Án Được Điều Khiển Bởi AI*

*"Không có tổ chức nào quá nhỏ để có AI."*
