# NPO AI Platform — Business Impression Document

**Nen tang AI da tac tu — Trai nghiem quan ly du an thong minh cho to chuc phi loi nhuan**

---

## 1. Tom tat dieu hanh (Executive Summary)

**NPO AI Platform** la nen tang AI da tac tu dau tien tai Viet Nam duoc thiet ke dac biet cho to chuc phi loi nhuan (NPO). He thong ket hop **7 Agent AI chuyen biet** hoat dong dong thoi, ket noi truc tiep voi Jira, Slack, va Knowledge Base de tu dong hoa toan bo quy trinh quan ly du an — tu truy van thong tin, tao bao cao, phan tich rui ro, den gui tin nhan noi bo.

**Dieu gi lam nen tang nay dac biet?**

> Khong chi la mot chatbot tra loi cau hoi. Day la mot **he thong tri tue to chuc** (Organizational Intelligence System) — hieu biet moi nguon du lieu, nho moi quyet dinh da duoc ra, va tu dong canh bao khi co van de xay ra.

---

## 2. Muc tieu doi tuong su dung

### 2.1 To chuc muc tieu

| Loai to chuc | Vi du | Nhu cau chinh |
|-------------|-------|---------------|
| **NPO tai Viet Nam** | Cac to chuc phi loi nhuan, NGO, bien phong | Quan ly da du an, da phong ban voi nguon luc han che |
| **Co quan chinh phu** | So, cuc, phong chuc nang | Tong hop bao cao, quan ly chuong trinh |
| **Doanh nghiep xahoi** | Social enterprise, Impact fund | Theo doi tac dong xa hoi, bao cao voi nha tai tro |
| **Don vi giao duc** | Truong hoc, hoc vien | Quan ly du hoc sinh, chuong trinh tinh nguyen |

### 2.2 Doi tuong nguoi dung

| Vai tro | Nhu cau | Cach nen tang ho tro |
|---------|---------|---------------------|
| **Lanh dao to chuc (Leader)** | Tong quan toan dien, quan sat real-time, ra quyet dinh nhanh | Dashboard tong hop, bao cao tu dong, canh bao rui ro |
| **Quan ly du an (Project Manager)** | Theo doi tien do, dieu phoi nhan su, xu ly ro ri | Chat AI hoi Jira, tao bao cao tu dong, phan tich rui ro |
| **Thanh vien team (Team Member)** | Cap nhat tien do, bao cao hang ngay, truy van thong tin | Chat AI tra loi nhanh, gui daily update, xem task |
| **Tinh nguyen vien (Volunteer)** | Hieu chinh sach, quy trinh, thuc hien cong viec | Hoi AI ve chinh sach, truy van tai lieu to chuc |

---

## 3. Muc tieu cua he thong

### 3.1 Muc tieu chinh

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. TU DONG HOA  →  Giam 70% thoi gian lam bao cao thu cong  │
│   2. TRUY VAN     →  Tra loi cau hoi to chuc trong 5 giay     │
│   3. CANH BAO     →  Phat hien rui ro truoc khi qua muon      │
│   4. TRI THUC     →  Khong mat thong tin khi nguoi di          │
│   5. PHOI HOP     →  Ket noi Jira + Slack + Document           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Muc tieu do luong (KPIs)

| Chi so | Truoc khi su dung | Sau khi su dung | Cai thien |
|--------|-------------------|-----------------|-----------|
| Thoi gian tao bao cao tuan | 3-4 gio/nguoi | 5 phut (tu dong) | **95%** |
| Thoi gian tra loi cau hoi noi bo | 2-4 gio (email/Slack) | 5-10 giay (AI chat) | **99%** |
| Ty le phat hien rui ro som | 30% (thu cong) | 85% (tu dong canh bao) | **183%** |
| Mat nguon tri thuc khi nguoi di | 60% thong tin mat | <5% (Institutional Memory) | **92%** |
| So luong bao cao/thang | 4 bao cao (thu cong) | 30+ bao cao (tu dong) | **650%** |
| Thoi gian onboarding nguoi moi | 2-4 tuan | 3-5 ngay | **75%** |

---

## 4. Moi lien ket (Integrations)

### 4.1 Moi lien ket hien tai

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

### 4.2 Khai niem MCP Gateway — "Mot cua so ket noi"

NPO AI Platform su dung **Model Context Protocol (MCP)** — mot tieu chuan mo cho phep AI ket noi an toan voi cac he thong ben ngoai. Thay vi phai viet rieng API cho moi dich vu, MCP Gateway **dong nhat hoa** cach ket noi:

| Dich vu | Phuong thuc ket noi | Loai thong tin |
|---------|---------------------|----------------|
| **Jira** | MCP Gateway → Streamable HTTP | Tasks, boards, transitions, comments |
| **Slack** | MCP Gateway → Streamable HTTP | Tin nhan, channels, gui draft |
| **Knowledge Base** | Bedrock Retrieve & Generate | Documents, policies, quy trinh |
| **DynamoDB** | AWS SDK (boto3) | Du lieu app: projects, risks, reports |

**Loi ich cua MCP Gateway**:
- **Bo sung dich vu moi** chi can them MCP target, khong can sua code agent
- **Bao mat**: JWT authentication, token caching, auto-refresh
- **Semantic Search**: Gateway ho tro tim kiem theo nghia (khong chi keyword)

### 4.3 Moi lien ket du kien (Roadmap)

| Giai doan | Tich hop | Gia tri |
|-----------|---------|---------|
| **Phase 1** (Hien tai) | Jira, Slack, Bedrock KB | Quan ly task + truy van tri thuc |
| **Phase 2** | Google Calendar, Outlook | Tu dong tao cuoc hop, напоминания |
| **Phase 3** | Google Drive, OneDrive | Truc tiep truy van file ma khong can upload |
| **Phase 4** | Email (SMTP) | Gui bao cao tu dong qua email |
| **Phase 5** | WhatsApp, Zalo | Lien lac voi nguoi dung cuoi (beneficiaries) |

---

## 5. Loi ich — Tai sao chon NPO AI Platform?

### 5.1 Loi ich ve nang suat (Productivity)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TU DONG HOA 100%                             │
│                                                                 │
│  Truoc:  Lanh dao gui tin nhan "Ai lam bao cao tuan?"          │
│          PM thu thap du lieu 2 gio                             │
│          Viet bao cao 2 gio                                    │
│          Gui email cho lanh dao 30 phut                        │
│          → TONG: 4.5 gio                                       │
│                                                                 │
│  Sau:    PM nhap "Tao bao cao tuan cho Green Hope"             │
│          → AI tu dong lay du lieu tu Jira                       │
│          → AI phan tich rui ro tu DynamoDB                      │
│          → AI tao bao cao Markdown + PDF                       │
│          → TONG: 5 phut                                        │
│                                                                 │
│  TIET KIEM: 4.5 gio/nguoi/tuan = 234 gio/nam                  │
│  = 29 ngay lam viec/nam duoc giai phong                        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Loi ich ve hieu qua (Efficiency)

| Kha nang | Mo ta | Hieu qua |
|----------|-------|----------|
| **Chat AI noi bo** | Bat ky ai trong to chuc co the hoi AI ve chinh sach, quy trinh | Giam 90% email/Slack hoi dap trung lap |
| **Canh bao tu dong** | AI phat hien task qua han, rui ro chua xu ly | Xu ly van de truoc khi tro thanh khung hoang |
| **Bao cao da phong ban** | Moi team tu dong gui bao cao, lanh dao nhin tong quan | Khong can "nhac nhau moi tuan" |
| **Tri thuc to chuc** | Moi quyet dinh, action item duoc ghi nho | Khong mat thong tin khi nguoi di |

### 5.3 Loi ich ve da phong ban (Cross-Department)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PHONG CHUONG TRINH        PHONG TAI CHINH                     │
│   - Quan ly task Jira       - Bao cao ngan sach                 │
│   - Theo doi milestone       - Tong hop chi phi                  │
│   - Phan tich rui ro         - Bao cao voi nha tai tro          │
│          │                           │                          │
│          └──────────┬────────────────┘                          │
│                     │                                           │
│                     ▼                                           │
│          ┌─────────────────────┐                                │
│          │  NPO AI PLATFORM    │                                │
│          │  (Tong hop tat ca)  │                                │
│          └──────────┬──────────┘                                │
│                     │                                           │
│          ┌──────────┴────────────────┐                          │
│          │                           │                          │
│          ▼                           ▼                          │
│   PHONG NHAN SU              PHONG TRUYEN THONG                │
│   - Onboarding tu dong       - Gui tin nhan Slack               │
│   - Ban giao khi roi di      - Tao noi dung bao cao             │
│   - Danh gia hieu suat       - Lien lac noi bo                  │
│                                                                 │
│   → TAT CA CUNG CHIA SE MOT NEN TANG TRI THUC CHUNG            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Loi ich ve bao mat & tu phu (Security & Autonomy)

| Tinh nang | Mo ta |
|-----------|-------|
| **Tenant Isolation** | Du lieu moi to chuc duoc cach ly hoan toan |
| **RBAC (4 roles)** | Leader > Project Manager > Team Member > Volunteer |
| **Human-in-the-Loop** | Moi hanh dong quan trong deu can nguoi xac nhan truoc khi thuc thi |
| **Audit Logging** | Moi thao tac duoc ghi nhat ky, truy xuat duoc |
| **KMS Encryption** | Du lieu ma hoa bang Customer Managed Key |
| **No Hallucination Policy** | AI KHONG BAO GIO bia du lieu — chi tra loi tu nguon chinh thuc |

### 5.5 Loi ich ve chi phi (Cost)

| Khoan muc | Chi phi uoc tinh/thang | Ghi chu |
|-----------|------------------------|---------|
| AWS Bedrock (LLM) | $50-150 | Nova Lite, pay-per-use |
| AWS DynamoDB | $25-50 | On-demand pricing |
| AWS S3 | $5-10 | Low storage + transfer |
| AWS Lambda | $10-30 | Serverless, chi tra khi su dung |
| AgentCore Runtime | $50-100 | 5 agents, pay-per-invocation |
| **Tong** | **$140-340/thang** | **Cho to chuc nho-trung binh** |

> **So sanh**: Mot nhan vien PM toan thoi luong $500-800/thang chi lam bao cao + quan ly task. NPO AI Platform **thay the 60-80% cong viec lap di lap lai** voi chi phi $140-340/thang.

---

## 6. Cac tinh nang noi bat de gay an tuong

### 6.1 Chat AI Noi Bo — "Hoi gi cung duoc"

```
Nguoi dung: "Chinh sach mua sam cua to chuc quy dinh gi ve don hang tren 500 USD?"

AI (tra loi trong 5 giay):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dua tren tai lieu "Procurement Policy v2.1":

Tat ca don hang vuot 500 USD can:
1. Phe duyet cap 1: Quan ly du an
2. Phe duyet cap 2: Pho Giam doc tai chinh
3. upload hoa don + chung tu ho tro

Thoi gian xu ly tieu chuan: 3-5 ngay lam viec.

Nguon: [Procurement Policy v2.1, Section 4.2]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Dac biet**: Moi cau tra loi di kem **citation** (nguon tai lieu chinh thuc) — dam bao AI khong bia dat.

### 6.2 Phan Tich Rui Ro Tu Dong — "Thay truoc khi qua muon"

```
┌──────────────────────────────────────────────┐
│  CANH BAO RUI RO — 2026-01-15               │
│                                              │
│  CRITICAL                                    │
│  Milestone "Phase 2 Rollout" da qua han      │
│  (han: 2026-01-10, da tre 5 ngay)           │
│                                              │
│  HIGH                                        │
│  Thanh vien Nguyen Van A co 4 task qua han   │
│  → Co the bi qua tai, can ho tro             │
│                                              │
│  MEDIUM                                      │
│  Co 3 rui ro CHUA CO giai phap giam thieu    │
│  → Can phan bo chu so huu                    │
│                                              │
│  [Xem chi tiet]  [Dieu phoi nhan su]         │
└──────────────────────────────────────────────┘
```

### 6.3 Bao Cao Tu Dong — "5 phut thay vi 5 gio"

AI tu dong tao 4 loai bao cao:
- **Bao cao ngay**: Chi nhung gi thay doi trong 24h qua
- **Bao cao tong quan**: Task + Rui ro + Milestone
- **Bao cao rui ro**: Phan tich chi tung rui ro theo muc do
- **Bao cao tien do**: So sanh ke hoach vs thuc te

Tat ca duoc tao tu **du lieu thuc te** (khong phai LLM hallucination), xuat duoi dang **Markdown + PDF** chuyen nghiep.

### 6.4 Institutional Memory — "Nho moi quyet dinh"

```
Cuoc hop hom nay:
  Quyet dinh: Chuyen doi cong nghe tu React sang Vue
  Ly do: Nhom dev Vue da co san, giam chi phi tuyen dung
  Nguoi tham gia: PM An, Tech Lead Binh, Lanh dao Cuong
  
  → AI tu dong luu vao Memory
  
Sau 6 thang, nguoi moi den hoi:
  "Tai sao su dung Vue thay vi React?"
  
  → AI tra loi: "Theo quyet dinh ngay 2026-01-15, to chuc 
     da chon Vue vi..."
```

---

## 7. Doi thu canh tranh & Vi tri hoa

### 7.1 So sanh voi cac giai phap khac

| Tieu chi | NPO AI Platform | ChatGPT/Custom GPT | PM Tools (Jira, Asana) | BI Tools (PowerBI) |
|----------|-----------------|--------------------|-----------------------|---------------------|
| **Dau noi Jira** | MCP (real-time) | Khong (can export) | Native | Can connector |
| **Dau noi Slack** | MCP (real-time) | Khong | Limited | Khong |
| **Knowledge Base** | RAG + Citation | Khong (chi general) | Khong | Khong |
| **Phan tich rui ro** | Tu dong, chu dong | Can prompt thu cong | Co ban | Co (nhung thu cong) |
| **Bao cao tu dong** | 4 loai, deterministic | General text | Limited | Co (nhung can setup) |
| **Tri thuc to chuc** | Memory + Extraction | Khong | Khong | Khong |
| **Bao mat (RBAC)** | 4 roles, audit log | Khong | Co | Co |
| **Ngon ngu Viet** | Native | Good | Limited | Limited |
| **Chi phi** | $140-340/thang | $20-200/thang | $50-500/thang | $100-500/thang |
| **Phu hop NPO** | **Thiet ke rieng** | Khong | Khong | Khong |

### 7.2 Loi the canh tranh

1. **Duy nhat**: Khong co san pham nao o Viet Nam thiet ke rieng cho NPO voi AI multi-agent
2. **Tich hop sau**: MCP Gateway cho phep ket noi Jira + Slack + Document ma khong can viet rieng API
3. **Bao mat**: Human-in-the-Loop — moi hanh dong quan trong deu can nguoi xac nhan
4. **Tri thuc to chuc**: Institutional Memory — khong mat thong tin khi nguoi di
5. **Ngon ngu Viet**: Moi cau tra loi, bao cao deu bang tieng Viet tu nhien
6. **Chi phi thap**: Serverless architecture, chi tra khi su dung

---

## 8. Roadmap phat trien

### Phase 1: Core Platform (Hien tai)
- [x] 7 AI Agent hoat dong
- [x] Jira MCP integration
- [x] Slack MCP integration
- [x] Bedrock Knowledge Base (RAG)
- [x] 70+ REST API endpoints
- [x] Next.js 14 frontend
- [x] Terraform IaC (12+ modules)
- [x] CI/CD (GitHub Actions)
- [x] 4 loai bao cao tu dong
- [x] Risk analysis engine
- [x] Institutional Memory

### Phase 2: Enhanced Intelligence (Q3 2026)
- [ ] Google Calendar integration — tao cuoc hop tu dong
- [ ] Email integration — gui bao cao qua email
- [ ] Multi-language support (English, French)
- [ ] Voice input (speech-to-text)
- [ ] Advanced analytics dashboard

### Phase 3: Ecosystem Expansion (Q4 2026)
- [ ] Google Drive / OneDrive direct access
- [ ] Custom agent builder (no-code)
- [ ] Mobile app (React Native)
- [ ] Offline mode (PWA)
- [ ] API marketplace for third-party integrations

### Phase 4: Enterprise Scale (2027)
- [ ] Multi-tenant SaaS platform
- [ ] White-label solution cho NPO khac
- [ ] Advanced compliance (GDPR, Vietnamese data laws)
- [ ] Federated learning (khong chia se du lieu)
- [ ] Industry-specific templates (Giao duc, Y te, Moi truong)

---

## 9. Doi ngu & Cong nghe

### Doi ngu phat trien

| Vi tri | So luong | Nhiem vu |
|--------|----------|----------|
| AI/ML Engineer | 2-3 | Agent development, prompt engineering, evaluation |
| Backend Engineer | 2 | API, Lambda, DynamoDB, integrations |
| Frontend Engineer | 1-2 | Next.js UI/UX |
| DevOps/Infra | 1 | Terraform, CI/CD, monitoring |
| Product/Domain | 1-2 | NPO domain expert, user research |

### Stack ky thuat

| Lop | Cong nghe |
|-----|-----------|
| AI/Agent | Python 3.12, LangGraph, Strands Agents, Bedrock |
| Backend | FastAPI/aiohttp, Lambda, DynamoDB, S3 |
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS |
| Infra | Terraform, AWS (AgentCore, Bedrock, Cognito, ECR) |
| Integration | MCP Protocol, Jira API, Slack API |
| CI/CD | GitHub Actions, Docker (ARM64) |

---

## 10. Cam ket voi NPO

### Nguyen tac cot loi

1. **AI phuc vu con nguoi** — Khong thay the nguoi, ma giup nguoi lam viec hieu qua hon
2. **Bao mat la tien de** — Moi hanh dong AI deu can nguoi xac nhan truoc khi thuc thi
3. **Khong hallucination** — AI chi tra loi dua tren du lieu thuc, khong bao gio bia dat
4. **Chi phi ben vung** — Serverless, chi tra khi su dung, phu hop ngan sach NPO
5. **Tri thuc la tai san** — Moi quyet dinh, moi thong tin deu duoc ghi nho va truy van duoc

### Loi hua

> "Chung toi tin rang moi to chuc phi loi nhuan xung dang mot he thong quan ly thong minh — khong phai chi nhung cong ty lon moi co AI."

NPO AI Platform duoc xay dung voi tam guong **danh rieng cho NPO**: giam thoi gian lam viec lap, tang nang luc phan tich, bao ve tri thuc to chuc, va giup moi nguoi tap trung vao **con nguoi** — dieu quan trong nhat.

---

## 11. Lien he

| Thong tin | Gia tri |
|-----------|---------|
| GitHub | `github.com/ltdungg/Little-Jerry-AI-Hackathon-2026` |
| Region | `ap-southeast-2` (Sydney) |
| Stack | AWS Bedrock AgentCore + LangGraph + Strands |
| Ngon ngu | Python 3.12 + TypeScript |

---

**NPO AI Platform** — *Empowering Non-Profits with AI-Driven Project Intelligence*

*"Khong co to chuc nao qua nho de co AI."*
