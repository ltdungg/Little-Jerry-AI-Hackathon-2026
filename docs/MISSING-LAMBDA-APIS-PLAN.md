# KẾ HOẠCH API LAMBDA CÒN THIẾU CHO FRONTEND (frontend-reactjs)

Tài liệu này trả lời câu hỏi: **để `frontend-reactjs` hiển thị dữ liệu thật thay vì mock, cần xây thêm những API Lambda / entity DynamoDB nào?**

> **Cập nhật trạng thái (2026-07-18, lần 2):** Toàn bộ Phase 0–3 (mục 3) đã được triển khai thật — mọi mock data trong `frontend-reactjs` đã được thay bằng gọi API thật, kèm entity DynamoDB + route Lambda mới cho phần chưa có. Phase 4 (P2 — connector/sync expose, report thật, ai-config, system-monitor) vẫn là kế hoạch, chưa code (độ ưu tiên thấp nhất, xem mục 6). Chi tiết theo từng phase có đánh dấu ✅ bên dưới.

Phạm vi tham chiếu:
- Trang cần có: `docs/MISSING-PAGES-PLAN.md` (13 trang P0, 11 trang P1, 6 trang P2).
- Kiến trúc & routes hiện có: `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/dynamodb.md`.
- Code thật đã đọc: `lambdas/api/handler.py`, `lambdas/tools/*`, `shared/models/*`, `gateway/tool-schemas/*`, toàn bộ `frontend-reactjs/src/services/*.service.ts` + `src/types/index.ts`, và `frontend/lib/api.ts` + `frontend/lib/auth.ts` (frontend Next.js đã wiring thật).

---

## 1. Hiện trạng

### 1.1 (Đã giải quyết) Từng có hai frontend song song — nay chỉ còn `frontend-reactjs/`
Bản đọc `README.md` trước đó (khi `frontend/` Next.js còn tồn tại) phát hiện 2 frontend song song. Trong lúc soạn kế hoạch này, một commit khác (`23bfeed feat: Complete institutional memory + replace all agent placeholders + React frontend`) đã **xoá hẳn `frontend/`** và mang `aws-amplify` + Cognito auth thật sang `frontend-reactjs/`. Xác nhận lại: dự án hiện **chỉ có một frontend — `frontend-reactjs/`** (Vite + React SPA), đúng như quan sát của người dùng.

Trạng thái `frontend-reactjs/` tại thời điểm bắt đầu triển khai (trước phiên làm việc này):
- `src/lib/auth.ts` — đã có sẵn, dùng `aws-amplify/auth` thật (`signIn`, `signOut`, `fetchAuthSession` lấy `idToken`).
- `src/lib/api.ts` — đã có sẵn `apiFetch()` tự gắn `Authorization: Bearer <idToken>`, cùng các hàm gọi mọi route thật đã tồn tại trước đó (`getProjects`, `getTasks`, `sendMessage`, `createWorkflow`, `createTaskProposal`, ...).
- `AuthContext.tsx` + `LoginPage.tsx` — đã dùng auth thật (không còn cờ localStorage giả).
- `vite.config.ts` — đã có alias `@/` + dev proxy `/v1` → `localhost:8080`.
- **Nhưng** cả 15 file `services/*.service.ts` (tasks, issues, decisions, notifications, ...) **vẫn 100% mock** — auth/API client tồn tại nhưng chưa có service nghiệp vụ nào gọi tới nó.

Tức là phần lớn Phase 0 (auth + API client) đã có sẵn — mục 3 bên dưới cập nhật lại để phản ánh đúng phần **còn thiếu thật sự**.

### 1.2 Backend Lambda thật đã có gì (`lambdas/api/handler.py`)

| Route | Trạng thái |
|---|---|
| `GET /health`, `GET /v1/me` | Hoạt động thật |
| `POST /v1/chat` | Hoạt động thật — proxy tới Orchestrator AgentCore runtime |
| `GET /v1/projects`, `GET /v1/projects/{id}` | Hoạt động thật (đọc `BusinessDataClient`) |
| `GET /v1/projects/{id}/tasks|risks|milestones` | Hoạt động thật |
| `POST /v1/projects/{id}/tasks/proposals` | **Stub** — build preview giả, không gọi `propose_task_change` tool thật |
| `POST /v1/workflows`, `GET /v1/workflows/{id}`, `.../confirm`, `.../cancel`, `GET /v1/reports/{id}` | **Toàn bộ là stub** trả literal `"wf-123"` / chuỗi cứng |

### 1.3 Entity DynamoDB thật đã có (`shared/models/keys.py`, `docs/dynamodb.md`)
Tenant, Program, User (profile/membership), Project, Milestone, Task, Risk, Connector (config/checkpoint/sync), Document (ingestion — SharePoint/Slack đã normalize, **khác** "tài liệu kho kiến thức" mà frontend cần).

### 1.4 Khoảng trống — entity nghiệp vụ **chưa tồn tại**
Issue, Decision, Meeting, Team (khác Project), Notification, WeeklyUpdate/TeamWeeklyReport, KnowledgeDocument (curated view), Handoff, OffboardingRecord, ActivityLog, SavedAnswer, ChatSession (route để expose), RolePermissionMatrix, OnboardingChecklist.

### 1.5 Bảng ánh xạ service → trang → API thật cần có

| Service frontend | Trang | API thật tương ứng hiện có | Việc cần làm |
|---|---|---|---|
| `tasks.service.ts` | `/my-tasks`, `/tasks` | `GET /v1/projects/{id}/tasks` (scope 1 project) | Thêm route liệt kê theo assignee xuyên project (đã có GSI1 `task_gsi1`), `PATCH` status/assignee/due-date, `POST` comment, thêm field `depends_on_task_ids` vào `Task` model |
| `updates.service.ts` | `/my-updates`, `/weekly-updates`, `/reports/team` | Không có | Entity `WeeklyUpdate` + `TeamWeeklyReport` + toàn bộ route |
| `notifications.service.ts` | `/notifications` | Không có | Entity `Notification` + route + cơ chế fan-out khi có sự kiện |
| `issues.service.ts` | `/issues` | Không có (Risk ≠ Issue) | Entity `Issue` + route + tool AI-suggest |
| `decisions.service.ts` | `/decisions`, `/knowledge/decisions` | Không có | Entity `Decision` + route + tool AI-suggest + approval flow |
| `meetings.service.ts` | `/meetings` | Không có | Entity `Meeting` + route + pipeline tóm tắt |
| `teams.service.ts` | `/teams` | Không có | Entity `Team` (khác Project member) |
| `people.service.ts` | `/members`, `/admin/users` | Chỉ có `User` profile tối giản | Mở rộng field (`kind`, `status`, `start/end date`) + route list/patch |
| `documents.service.ts` | `/knowledge` | Có `Document` ingestion nhưng khác mục đích | Entity `KnowledgeDocument` (curated) + route |
| `activityLog.service.ts` | `/admin/activity-log` | Không có | Entity `ActivityLog` + helper ghi log dùng chung |
| `chat.service.ts` | `/assistant/history`, `/assistant/saved` | Session/projection có trong `WorkflowState` nhưng chưa có route; `SavedAnswer` chưa tồn tại | Thêm route + entity `SavedAnswer` |
| `onboarding.service.ts` | `/onboarding` | Không có | Aggregate lambda (derive từ Team/Project/Document/Task) + entity `OnboardingChecklist` nhỏ |
| `handoff.service.ts` | `/handoff`, `/offboarding` | Không có | Entity `Handoff` + `OffboardingRecord` |
| `roles.service.ts` | `/admin/roles` | Cognito Groups có, nhưng không có ma trận quyền theo hành động | Entity/config `RolePermissionMatrix` |
| `reports.service.ts` | `/reports/leadership` | Suy ra từ Issue/Decision/TeamWeeklyReport | Aggregate lambda, phụ thuộc các API trên |

---

## 2. Nguyên tắc thiết kế

1. **Theo đúng convention hiện có**: mọi entity mới nằm trong bảng `BusinessData` (single-table), không dùng `Scan`; key builder thêm vào `shared/models/keys.py`; Pydantic model thêm vào `shared/models/*.py`; repository protocol thêm vào `shared/models/repositories.py` (xem `docs/dynamodb.md` mục 5).
2. **Route mới nối theo pattern regex đã có** trong `lambdas/api/handler.py` (`PROJECT_TASKS_RE`, `_task_view()`...). Vì file này sẽ phình to nhiều lần, **nên tách thành `lambdas/api/routes/<domain>.py`** ngay khi bắt đầu Phase 1, tránh phải refactor giữa chừng.
3. **Phân biệt rõ 2 loại dữ liệu:**
   - *CRUD thường* (Team, Notification, Handoff, ActivityLog, User mở rộng...) → viết Lambda REST thuần, giống `handle_list_tasks`.
   - *Nội dung AI đề xuất* (Issue "ai_suggested", Decision "ai_suggested/draft", WeeklyUpdate draft, Meeting summary, Onboarding FAQ) → **không hardcode giả**. Phải đi qua Orchestrator/Agent thật (Knowledge Agent, Reporting Agent...) hoặc một tool mới theo đúng pattern *dry-run + confirmation_token* của `propose_task_change.py` (xem `docs/architecture.md` mục 6, UC-03). Điều này đồng nghĩa: **phải hoàn thiện các stub `handle_create_workflow/get_workflow/confirm_workflow`** trước khi tính năng AI-suggest có thể chạy thật — hiện các hàm này chỉ trả `"wf-123"` cứng.
4. **Ghi audit tập trung**: mọi handler có side-effect (approve/reject/edit/export/share/permission_changed/account_locked, hoặc Knowledge Agent trả lời có citation) gọi chung 1 helper `record_activity(...)` ghi vào entity `ActivityLog` — tránh mỗi domain tự ghi log theo cách khác nhau.
5. **Auth là điều kiện tiên quyết (Phase 0)**: `frontend-reactjs` phải thay `AuthContext` giả bằng Cognito thật (`aws-amplify`) + một `apiClient.ts` gắn `Authorization: Bearer <id_token>` — nếu không, mọi API thật phía sau đều vô nghĩa vì API Gateway sẽ trả 401.

---

## 3. Chi tiết theo nhóm (bám theo thứ tự P0/P1/P2 của `MISSING-PAGES-PLAN.md`)

### Phase 0 — Nền tảng ✅ Đã triển khai
- Auth + `lib/api.ts` **đã có sẵn** trước phiên này (xem mục 1.1) — không cần làm.
- ✅ Entity `ActivityLog` (tenant-wide, PK `TENANT#<t>`, SK `ACTIVITY#<createdAt>#<logId>`) + helper `_record_activity()` trong `lambdas/api/handler.py`, gọi từ mọi handler có side-effect (task/issue/decision/task-proposal).
- ✅ Hoàn thiện thật `handle_create_workflow / handle_get_workflow / handle_confirm_workflow / handle_cancel_workflow / handle_get_report` — không còn trả literal `"wf-123"`. Dùng `WorkflowStateClient` mới (`agents/common/clients/workflow_client.py`, bảng `WORKFLOW_TABLE`, key đơn giản `PK=WORKFLOW#<id> SK=META` — nhất quán với style đơn giản hoá đã có trong `BusinessDataClient`, **không** dùng pattern GSI phức tạp của `shared/models/keys.py`).
- ✅ Nối luôn `POST /v1/projects/{id}/tasks/proposals` → `POST /v1/workflows/{id}/confirm` thành một luồng thật: proposal được lưu vào `WorkflowState` kèm `confirmation_token`; khi confirm đúng token, handler tạo task thật qua `BusinessDataClient.put_task()`. Đây là ví dụ đầu tiên chạy thật end-to-end của luồng "AI đề xuất → người duyệt xác nhận" mô tả ở UC-03 (`docs/architecture.md`).
- ⚠️ Sai khác so với kế hoạch gốc: **không tạo Pydantic model riêng** (`shared/models/issue.py`, `decision.py`, ...) như dự kiến — `lambdas/api/handler.py` thực tế không dùng Pydantic cho Task/Risk (chỉ `dict.get()` + view mapper), nên Issue/Decision/Notification/ActivityLog đi theo đúng convention thật đó thay vì convention lý tưởng trong `dynamodb.md`.

### Phase 1 — 4 entity lõi ✅ Đã triển khai (CRUD thật, chưa có phần AI tự động phát hiện)

**Nhiệm vụ của tôi / Nhiệm vụ (`/my-tasks`, `/tasks`)**
- ✅ Route mới: `GET /v1/tasks` (toàn tenant, dùng `list_all_tasks()` có sẵn), `GET /v1/me/tasks` (theo assignee, `BusinessDataClient.list_tasks_by_assignee` mới — fan-out qua các project vì chưa có GSI theo assignee, xem docstring trong code), `PATCH /v1/projects/{id}/tasks/{taskId}` (status/assignee/due_date/blocked_reason), `POST /v1/projects/{id}/tasks/{taskId}/comments`.
- ✅ `depends_on_task_ids` và `comments` được `_task_view()` trả về (đọc từ item nếu có, mặc định `[]`) — nhưng **chưa có UI/route nào ghi `depends_on_task_ids`** (chỉ đọc), vì chưa có trang nào cần tạo phụ thuộc giữa task.
- ✅ Frontend: `tasks.service.ts` viết lại gọi API thật, giữ nguyên chữ ký hàm cũ. Vì backend cần `project_id` để PATCH nhưng chữ ký cũ chỉ nhận `task id`, service cache `project_id` theo `task_id` từ lần `listTasks()` gần nhất (thay cho mảng mock trong bộ nhớ trước đây).

**Khó khăn (`/issues`)**
- ✅ `BusinessDataClient` thêm `list_issues/list_all_issues/get_issue/put_issue/update_issue` — key PK `TENANT#<t>#PROJECT#<p>`, SK `ISSUE#<issueId>` (dict thô, không Pydantic).
- ✅ Route: `GET /v1/issues` (toàn tenant, filter status/impact/source/project_id), `PATCH /v1/issues/{issueId}?project_id=` (status/owner/source/resolution_plan), `DELETE /v1/issues/{issueId}?project_id=` (dismiss AI issue).
- ❌ **Chưa làm**: tool `detect_issues_from_activity` (AI tự quét Slack/meeting note để tạo issue `ai_suggested`) — vẫn là việc thủ công/qua seed data. Đây là phần còn lại lớn nhất của Phase 1.

**Quyết định (`/decisions`, `/knowledge/decisions`)**
- ✅ `BusinessDataClient` thêm `list_decisions/list_all_decisions/get_decision/put_decision/update_decision`.
- ✅ Route: `GET /v1/decisions` (toàn tenant), `PATCH /v1/decisions/{id}?project_id=` (approve → `approval_status=confirmed` + `approver_name`, hoặc reject).
- ❌ **Chưa làm**: sinh bản nháp quyết định bằng AI (dry-run + confirmation_token như `propose_task_change`) — hiện quyết định `ai_suggested` chỉ có qua seed data thủ công.

**Thông báo (`/notifications`)**
- ✅ `BusinessDataClient` thêm `list_notifications/put_notification/mark_notification_read/mark_all_notifications_read` — PK `TENANT#<t>#USER#<u>`, SK `NOTIF#<createdAt>#<notificationId>`.
- ✅ Route: `GET /v1/me/notifications`, `POST /v1/me/notifications/{id}/read`, `POST /v1/me/notifications/read-all`.
- ❌ **Chưa làm**: `GET/PUT /v1/me/notification-preferences` (không có trang nào gọi hiện tại nên bỏ qua) và cơ chế fan-out tự động tạo notification khi có sự kiện khác (task assigned, issue mới...) — hiện chỉ có seed data thủ công, chưa có `notify_user()` helper gọi từ các handler khác.

**Nhật ký hoạt động (`/admin/activity-log`, làm sớm hơn kế hoạch vì cần cho `_record_activity` ở Phase 0)**
- ✅ Route `GET /v1/activity-log?action=` + `activityLog.service.ts` nối vào API thật.
- Helper `notify_user(...)` được gọi fan-out từ các handler khác (task assigned, issue mới, decision pending, update sắp đến hạn, tài liệu cập nhật, handoff chờ xác nhận) — tra theo đúng 11 `NotificationType` đã định nghĩa ở `frontend-reactjs/src/types/index.ts`.

### Phase 2 — Phần P0 còn lại ✅ Đã triển khai

**Cập nhật của tôi / Cập nhật hằng tuần / Bảng thông tin nhóm** (`/my-updates`, `/weekly-updates`, `/reports/team`)
- ✅ Entity `WeeklyUpdate` (PK `TENANT#<t>#USER#<u>`, SK `UPDATE#<week>`) + `TeamWeeklyReport` (PK `TENANT#<t>#TEAM#<teamId>`, SK `REPORT#<week>`).
- ✅ Route: `GET /v1/me/updates/current`, `GET/PUT /v1/me/updates`, `POST /v1/me/updates/{week}/submit`, `GET /v1/teams/{id}/reports`, `GET /v1/team-reports` (tất cả nhóm), `POST .../reports/{week}/approve|publish|remind`.
- ❌ **Chưa làm**: tool `generate_weekly_update_draft` (Reporting Agent tự tổng hợp draft từ hoạt động thật) — hiện `saveUpdateDraft` vẫn do người dùng tự nhập tay, không có bản nháp AI.

**Cuộc họp (`/meetings`)**
- ✅ Entity `Meeting` (nested action items, PK `TENANT#<t>`, SK `MEETING#<id>`) + route `GET /v1/meetings`, `GET /v1/meetings/{id}`, `POST .../action-items/{id}/confirm|reject`.
- ❌ **Chưa làm**: pipeline `sync_meeting_notes` tự tóm tắt transcript bằng Bedrock, và `POST .../send-summary` — meeting hiện chỉ tạo qua seed/thủ công.

**Các nhóm (`/teams`)** ✅ — entity + `GET /v1/teams`, `GET /v1/teams/{id}`.

**Danh sách thành viên / Người dùng (`/members`, `/admin/users`)** ✅ — entity `UserProfile` mới (không mở rộng Cognito claims) PK `TENANT#<t>`, SK `USERPROFILE#<userId>`; route dùng chung `GET /v1/users?team=&kind=&status=`, `PATCH /v1/users/{id}` (status).

**Kho tài liệu (`/knowledge`)**
- ✅ Entity `KnowledgeDocument` (curated view, tách biệt hoàn toàn khỏi `Document` ingestion — PK `TENANT#<t>`, SK `KDOC#<id>`) + route `GET /v1/documents`, `PATCH /v1/documents/{id}`.
- ❌ **Chưa làm**: tự động tính cờ `aiFlag` (duplicate/conflicting/stale) bằng Knowledge Agent — hiện `aiFlag` chỉ set thủ công qua seed/PATCH.

**Nhật ký hoạt động (`/admin/activity-log`)** ✅ — route `GET /v1/activity-log?action=`.

**Bảng thông tin lãnh đạo (`/reports/leadership`)** ✅ — `GET /v1/reports/leadership-summary`, tổng hợp thật từ Project/Issue/Decision/TeamWeeklyReport (không entity mới).

### Phase 3 — P1 ✅ Đã triển khai

- **Lịch sử trao đổi** (`/assistant/history`) ✅ — entity `ChatSession` mới (đơn giản hơn dự kiến ban đầu: không tái dùng `WorkflowState` session/projection vì chưa có client cho bảng đó — dùng PK `TENANT#<t>#USER#<u>`, SK `SESSION#<id>` trong `BusinessData`). `handle_chat` tự động tạo/cập nhật session mỗi lần gửi tin nhắn thật (`_upsert_chat_session`) — không chỉ là CRUD tĩnh, phiên trò chuyện phản ánh đúng lịch sử dùng thật.
- **Câu trả lời đã lưu** (`/assistant/saved`) ✅ — entity `SavedAnswer` mới, route `GET/POST/DELETE /v1/me/saved-answers`.
- **Tìm kiếm kiến thức** (`/assistant/search`) ✅ — không cần route riêng, tái dùng `listDocuments`/`listDecisions` (đã thật) lọc phía client; không cần sửa gì thêm.
- **Hướng dẫn người mới** (`/onboarding`) ✅ — nội dung tenant-wide (`ONBOARDING#default`) + checklist theo user, route `GET /v1/onboarding`, `POST /v1/onboarding/checklist/{id}/toggle`. Đơn giản hơn dự kiến (không derive động từ Team/Project/Task — nội dung là 1 tài liệu biên tập sẵn, giống mock, chỉ khác là lưu thật).
- **Bàn giao / Kết thúc tham gia** (`/handoff`, `/offboarding`) ✅ — entity `Handoff` + `OffboardingRecord`, route `GET/PATCH /v1/handoffs/{id}`, `GET /v1/offboarding`, `POST /v1/offboarding/{id}/confirm-handoff-complete`.
- **Vai trò và quyền** (`/admin/roles`) ✅ — 1 item cấu hình `ROLE_PERMISSIONS` cho toàn tenant, route `GET/PATCH /v1/roles/permissions`.

**Ngoài dự kiến ban đầu:** cũng đã nối 2 trang lõi phát hiện thiếu ở vòng review trước — `/projects`, `/projects/:id` (service `projects.service.ts` mới, trước đó dùng `PROJECTS` cứng dù `/v1/projects` đã có từ lâu) và `/assistant` (trước đó dùng `QA_BANK` cứng dù `/v1/chat` đã hoạt động). Toàn bộ `lib/mockData.ts` và `services/mockClient.ts` đã bị xoá — không còn file mock nào trong `frontend-reactjs`.

### Phase 4 — P2 (hạ tầng nội bộ, ưu tiên thấp nhất)

- **Nguồn dữ liệu / Đồng bộ dữ liệu** (`/admin/data-sources`, `/admin/sync`): `Connector`/`Sync` **đã tồn tại thật** trong `BusinessData` table — chỉ thiếu route expose: `GET /v1/connectors`, `GET /v1/connectors/{id}/syncs`, `POST /v1/connectors/{id}/sync` (trigger thủ công).
- **Báo cáo đã xuất / Báo cáo hằng tuần** (`/reports/exported`, `/reports/weekly`): dùng `Report` entity đã có key pattern (`report_sk`) nhưng handler `handle_get_report` hiện là stub — cần nối thật + thêm `GET /v1/projects/{id}/reports` (list, hiện chưa có route).
- **Cấu hình trí tuệ nhân tạo / Theo dõi hệ thống** (`/admin/ai-config`, `/admin/system-monitor`): hoàn toàn mới, độ ưu tiên nghiệp vụ thấp nhất — có thể để cấu hình tĩnh (env var/SSM) ở bản đầu thay vì xây API riêng.

---

## 4. Danh sách file cần tạo/sửa (tóm tắt kỹ thuật)

| Khu vực | File | Việc cần làm |
|---|---|---|
| Models | `shared/models/{issue,decision,meeting,team,notification,weekly_update,knowledge_document,handoff,activity_log,saved_answer}.py` | Tạo mới, theo pattern `task.py`/`risk.py` |
| Keys | `shared/models/keys.py` | Thêm key builder + GSI cho từng entity trên |
| Repositories | `shared/models/repositories.py` | Thêm Protocol tương ứng (`IssueRepository`, `DecisionRepository`, ...) |
| Data client | `agents/common/clients/dynamodb_client.py` | Thêm method `list_issues`, `get_issue`, `list_decisions`, ... vào `BusinessDataClient` |
| API routes | `lambdas/api/handler.py` → tách thành `lambdas/api/routes/*.py` | Thêm route + `handle_*` + `_xxx_view()` mapper cho từng entity; hoàn thiện các stub workflow hiện có |
| Agent tools | `lambdas/tools/{detect_issues_from_activity,propose_decision,generate_weekly_update_draft,generate_meeting_summary}.py` | Theo pattern dry-run + `confirmation_token` của `propose_task_change.py` |
| Gateway schema | `gateway/tool-schemas/*.json` | Schema cho từng tool mới |
| Ingestion | `lambdas/ingestion/sync_meeting_notes.py` (mới) | Theo pattern `sync_slack`/`sync_sharepoint` |
| Infra | `infra/modules/api` | Thêm API Gateway route integration khớp path mới |
| Infra | `infra/modules/data` | Thêm attribute/GSI mới nếu cần (vd. GSI3 cho notification-by-user-unread) |
| Docs | `docs/dynamodb.md`, `docs/api.md`, `docs/architecture.md` | Cập nhật sau khi entity hoàn thiện |
| Frontend | `frontend-reactjs/src/lib/{auth,apiClient}.ts` (mới — port từ `frontend/lib/{auth,api}.ts`), `src/context/AuthContext.tsx` | Auth thật + fetch client, xem Phase 0 |
| Frontend | `frontend-reactjs/src/services/*.service.ts` (15 file) | Giữ nguyên tên hàm/signature, chỉ thay thân hàm gọi `apiClient` thay vì mảng mock |
| Frontend | `package.json`, `.env` | Thêm `aws-amplify`, biến `VITE_API_BASE_URL`, `VITE_COGNITO_*` (đối chiếu `frontend/.env.example` để lấy đúng tên biến Cognito) |
| Docs | `README.md` | Cập nhật mục "Cấu trúc thư mục"/"Frontend" nếu `frontend-reactjs` trở thành frontend chính thức (xem Phase 0) |

---

## 5. Thứ tự triển khai đề xuất

1. ✅ **Phase 0** — entity `ActivityLog`/helper + hoàn thiện stub workflow (auth/`lib/api.ts` đã có sẵn từ trước).
2. ✅ **Phase 1** — Task xuyên project (`/my-tasks`, `/tasks`), `Issue`, `Decision`, `Notification`.
3. ✅ **Phase 2** — `WeeklyUpdate`/`TeamWeeklyReport`, `Meeting`, `Team`, `UserProfile` (members/admin-users), `KnowledgeDocument`, aggregate `reports/leadership`.
4. ✅ **Phase 3 (P1)** — Assistant history/saved, Onboarding, Handoff/Offboarding, admin/roles. Cũng tiện thể nối luôn `/projects` và `/assistant` (phát hiện thêm là vẫn dùng mock dù API đã có từ trước).
5. **Phase 4 (P2)** — chưa làm: route expose Connector/Sync có sẵn, Report thật (`get_report_by_id` đã có nhưng chưa có dữ liệu Report thật do `store_report_artifact` tool chưa ghi vào bảng này), ai-config, system-monitor.

Phần **AI tự động** (issue/decision/weekly-update draft do AI đề xuất, meeting summary tự tóm tắt, aiFlag tự phát hiện tài liệu trùng/cũ) **vẫn chưa làm** ở mọi phase — toàn bộ nội dung "AI đề xuất" hiện có trong hệ thống đến từ seed data thủ công, không phải agent thật gọi Bedrock. Đây là phần còn lại lớn nhất, xem ghi chú "Không hardcode nội dung AI đề xuất" bên dưới.

### File đã thay đổi thật (toàn bộ Phase 0–3)
Backend: `agents/common/clients/dynamodb_client.py` (mở rộng toàn bộ entity), `agents/common/clients/workflow_client.py` (mới), `agents/common/clients/__init__.py` (export), `lambdas/api/handler.py` (toàn bộ route + handler + view mapper mới — vẫn 1 file, xem lưu ý "Tách file sớm"), `lambdas/common/utils.py` (sửa bug Decimal→string khi serialize JSON, ảnh hưởng mọi field số toàn hệ thống), `scripts/seed_dynamodb.py` (seed đầy đủ mọi entity mới).

Frontend: `frontend-reactjs/src/lib/api.ts` (toàn bộ hàm gọi route mới), toàn bộ 16 file `frontend-reactjs/src/services/*.service.ts` (bao gồm `projects.service.ts` mới) nối API thật, `AssistantPage.tsx`/`ProjectsOverviewPage.tsx`/`ProjectDetailPage.tsx`/`TasksPage.tsx`/`KnowledgeSearchPage.tsx`/`HomeDashboardPage.tsx`/`MyUpdatesPage.tsx` cập nhật theo, `lib/mockData.ts` + `services/mockClient.ts` đã **xoá hẳn**, `.env.example` (mới).

Đã kiểm chứng bằng smoke test `moto` (mock DynamoDB thật) cho toàn bộ route mới + `tsc -b` + `vite build` + `npm run lint` + bộ `pytest` có sẵn — tất cả pass.

---

## 6. Rủi ro / lưu ý

- **Không hardcode nội dung "AI đề xuất"**: toàn bộ Issue/Decision "ai_suggested", Meeting summary, aiFlag tài liệu... hiện đến từ seed data thủ công, KHÔNG phải agent thật gọi Bedrock. Nếu để lâu dài như vậy, sản phẩm lặp lại đúng vấn đề trước đây của `handle_create_workflow` (từng trả `"wf-123"` cứng) — mất giá trị cốt lõi "trợ lý AI có dẫn nguồn" của toàn hệ thống. Cần nối các entity này với Risk Analysis Agent / Memory Extraction Agent (đã có sẵn trong `agents/risk_analysis`, `agents/memory_extraction`) hoặc tool mới kiểu `propose_task_change`.
- **Tách file sớm**: `lambdas/api/handler.py` đã tăng từ ~310 dòng lên hơn 1300 dòng sau Phase 0–3. Vẫn giữ 1 file vì mọi route theo cùng 1 pattern đơn giản (dict + view mapper), nhưng nếu làm tiếp Phase 4 hoặc thêm nghiệp vụ mới, nên tách theo domain (`lambdas/api/routes/*.py`) trước khi file khó review được nữa.
- **Bug đã sửa, đáng chú ý**: `lambdas/common/utils.py` dùng `json.dumps(body, default=str)` khiến mọi số lấy từ DynamoDB (kiểu `Decimal`) bị serialize thành **string** thay vì number trong response JSON (vd. `"message_count": "1"` thay vì `1`). Đã sửa bằng converter riêng cho `Decimal`. Nếu revert `lambdas/common/utils.py` vì lý do khác, nhớ giữ lại fix này.
- **Thông báo real-time hay poll**: hiện dùng GET định kỳ (poll) là đủ cho MVP; nếu cần real-time (WebSocket/SNS) phải xác nhận thêm với chủ dữ liệu vì ảnh hưởng tới hạ tầng (API Gateway WebSocket API, thêm connection table).
- **P2 có thể chấp nhận chưa có API thật lâu hơn** (vd. `ai-config`, `system-monitor`) — ưu tiên đúng theo tinh thần MVP đã nêu trong `MISSING-PAGES-PLAN.md`.
- **Cache id→key trong nhiều service frontend** (`tasks`, `issues`, `decisions`, `updates`.service.ts): vì backend cần khoá phức hợp (project_id, week...) mà chữ ký hàm gốc chỉ nhận 1 id, các service này lưu một `Map` tra cứu tạm được điền từ lần `list...()` gần nhất. Hệ quả: nếu gọi hàm mutate (`updateTaskStatus`, `submitUpdate`...) mà chưa từng gọi `list...()` trong phiên đó, hàm sẽ ném lỗi rõ ràng thay vì âm thầm sai — đây là đánh đổi có chủ ý để giữ nguyên chữ ký hàm cũ, không phải bug.
- **Hai frontend cùng gọi chung 1 backend**: nếu cả `frontend/` và `frontend-reactjs` cùng tồn tại song song sau khi triển khai kế hoạch này, mọi route mới ở mục 3 nên được thiết kế tổng quát (không giả định field/shape chỉ khớp riêng 1 UI) để cả hai FE dùng chung được — tránh phải nhân đôi API cho cùng một entity.
- `MISSING-PAGES-PLAN.md` ghi chú tham chiếu "README.md mục 17 — Phạm vi phiên bản đầu tiên" và "mục 3–12", nhưng `README.md` hiện tại (bản đã đọc) không còn các mục đánh số này — nhiều khả năng tài liệu yêu cầu nghiệp vụ gốc (business brief) đã được thay thế bởi bản README kỹ thuật hiện nay. Nên hỏi lại chủ dự án xem tài liệu use-case gốc (1–17) còn lưu ở đâu, vì nó là nguồn xác định phạm vi MVP chính xác hơn suy luận từ code.
