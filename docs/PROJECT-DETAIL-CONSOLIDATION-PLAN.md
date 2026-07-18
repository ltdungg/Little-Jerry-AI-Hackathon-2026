# Gộp các trang điều phối công việc vào Chi tiết dự án

> Đặc tả thay đổi giao diện: bỏ các mục cấp cao trên sidebar (Khó khăn, Bàn giao, Nhiệm vụ, Cập nhật hằng tuần, Cuộc họp) và dồn phần thao tác/quản lý vào bên trong trang **Chi tiết dự án** (thêm mới tab Cập nhật hằng ngày, Xuất báo cáo hằng ngày/hằng tuần). Trang "Công việc" (`/projects`) chỉ còn là danh sách dự án; bấm vào một dự án mới thấy các phần trên. Riêng **Báo cáo hằng tuần** (`/reports/weekly`) và **Bảng thông tin của nhóm** (`/reports/team`) *không bị xoá* — vẫn là trang tổng hợp, chứa dữ liệu của **tất cả dự án** để nhìn toàn cảnh, chỉ khác là việc tạo/sửa/duyệt chi tiết chuyển vào tab dự án tương ứng (xem mục 2, 3.1).

## 1. Hiện trạng

Route và trang hiện có (`frontend-reactjs/src/App.tsx`, `src/lib/navConfig.ts`):

| Sidebar hiện tại | Path | Trang | Phạm vi dữ liệu hiện tại |
|---|---|---|---|
| Chương trình | `/projects` | `ProjectsOverviewPage.tsx` | Danh sách dự án |
| Chương trình → chi tiết | `/projects/:id` | `ProjectDetailPage.tsx` | Placeholder — có ô "sẽ hiển thị tại đây" (dòng 81-93), chưa nhúng tab nào |
| Nhiệm vụ | `/tasks` | `TasksPage.tsx` | Toàn bộ task mọi dự án |
| Cập nhật hằng tuần | `/weekly-updates` | `WeeklyUpdatesPage.tsx` | Tab "Báo cáo nhóm" + "Báo cáo toàn tổ chức", mọi dự án |
| Khó khăn | `/issues` | `IssuesPage.tsx` | Toàn bộ issue mọi dự án |
| Cuộc họp | `/meetings` | `MeetingsPage.tsx` | Toàn bộ meeting mọi dự án |
| Bàn giao | `/handoff` | `HandoffPage.tsx` | Toàn bộ handoff mọi dự án |
| Báo cáo hằng tuần | `/reports/weekly` | *(chưa dựng, PlaceholderPage)* | — |
| Báo cáo đã xuất | `/reports/exported` | *(chưa dựng, PlaceholderPage)* | — |

Các type dữ liệu (`src/types/index.ts`) của `Task`, `Issue`, `Meeting`, `Handoff`, `WeeklyUpdate` **đã có sẵn** trường `programId`/`programName` (hoặc tương đương) — nghĩa là dữ liệu vốn đã thuộc về một dự án cụ thể, chỉ đang bị hiển thị gộp chung ở trang cấp cao thay vì lọc theo dự án. Việc gộp về Chi tiết dự án chủ yếu là bài toán **điều hướng + lọc dữ liệu**, không cần đổi model.

Các trang/route sau **không nằm trong yêu cầu gộp**, giữ nguyên vị trí:
- `Quyết định` (`/decisions`) — không có trong danh sách yêu cầu.
- `Nhiệm vụ của tôi` (`/my-tasks`), `Cập nhật của tôi` (`/my-updates`) — thuộc phạm vi cá nhân, không phải theo dự án.
- `Bảng thông tin của nhóm` (`/reports/team`), `Bảng thông tin lãnh đạo` (`/reports/leadership`), `Báo cáo đã xuất` (`/reports/exported`) — là view tổng hợp **nhiều dự án**, không thể chuyển hẳn vào một dự án; xem mục 6.

## 2. Sidebar sau khi gộp

Nhóm **"Điều phối công việc"** rút gọn còn 2 mục:

```text
Điều phối công việc
├── Công việc          /projects        (danh sách dự án — đổi nhãn từ "Chương trình")
└── Quyết định         /decisions       (giữ nguyên, không đổi)
```

Xoá hẳn khỏi sidebar (nội dung generation/thao tác chuyển vào tab trong Chi tiết dự án — xem mục 3), vì các mục này vốn chỉ hiển thị một danh sách phẳng không phân biệt dự án và không có lý do tồn tại độc lập:
- Nhiệm vụ (`/tasks`)
- Cập nhật hằng tuần (`/weekly-updates`)
- Khó khăn (`/issues`)
- Cuộc họp (`/meetings`)
- Bàn giao (`/handoff`) — xoá khỏi nhóm "Con người và bàn giao"

**Không xoá `/reports/weekly` ("Báo cáo hằng tuần") và `/reports/team` ("Bảng thông tin của nhóm")** — hai trang này **đổi vai trò** thành trang tổng hợp nhiều dự án thay vì bị xoá:

| Trang | Vai trò cũ | Vai trò mới sau khi gộp |
|---|---|---|
| `/reports/weekly` | Nơi tạo/xem báo cáo tuần (chưa dựng, placeholder) | Trang **chỉ đọc, tổng hợp** báo cáo tuần của **tất cả dự án**: mỗi dòng là 1 dự án + trạng thái báo cáo tuần mới nhất (Đang tạo/Bản nháp/Đã duyệt/Đã xuất), bấm vào để mở đúng tab "Xuất báo cáo" của dự án đó mà xem/sửa/xuất PDF |
| `/reports/team` | Chọn 1 nhóm, xem `TeamWeeklyReport` của nhóm đó (đã dựng, xem `TeamReportPage.tsx`) | Giữ nguyên chức năng hiện tại (do một nhóm có thể phụ trách **nhiều** dự án — `Team.programNames: string[]`, xem mục 3.1) — là nơi xem tổng hợp toàn bộ nhóm xuyên suốt mọi dự án nhóm đó phụ trách. Việc quản lý/sửa phần thuộc riêng 1 dự án chuyển vào tab "Xuất báo cáo" của dự án đó (mục 3.1) |

Việc tạo/sửa/xuất báo cáo **cho một dự án cụ thể** luôn thực hiện trong tab "Xuất báo cáo" của Chi tiết dự án đó (mục 3); các trang trên chỉ tổng hợp lại để nhìn nhanh toàn cảnh nhiều dự án, không có thao tác generate/edit riêng.

File cần sửa: `src/lib/navConfig.ts` (xoá các `NavLeaf` không còn cần cho Nhiệm vụ/Cập nhật hằng tuần/Khó khăn/Cuộc họp/Bàn giao, đổi `label` của mục `/projects` thành "Công việc", **giữ nguyên** `NavLeaf` của `/reports/weekly` và `/reports/team` nhưng cập nhật `blurb`/`features` theo vai trò mới ở bảng trên), route `App.tsx` bỏ `<Route>` cho các path đã xoá, viết lại `WeeklyReportRollupPage` cho `/reports/weekly` (hiện là PlaceholderPage, cần dựng mới đúng vai trò tổng hợp).

## 3. Cấu trúc trang Chi tiết dự án (`/projects/:id`)

Chuyển từ trang tĩnh sang trang có tab. Đề xuất thứ tự tab:

| # | Tab | Nguồn nội dung chuyển vào | Lọc theo |
|---|---|---|---|
| 1 | Tổng quan | Nội dung hiện có của `ProjectDetailPage.tsx` (progress, info tiles, overdue/risk count) | — |
| 2 | Nhiệm vụ | `TasksPage.tsx` (bảng, filter quá hạn/chưa giao/chưa hạn, dependency, comment) | `task.programId === project.id` |
| 3 | Khó khăn | `IssuesPage.tsx` (mức ảnh hưởng, tab AI đề xuất, gộp trùng, leo thang) | `issue.programId === project.id` |
| 4 | Cập nhật hằng ngày | **Mới** — xem mục 4. Chỉ có tab này, **không có tab "Cập nhật hằng tuần" riêng** | `project.id` + ngày hiện tại |
| 5 | Xuất báo cáo | Trang `/reports/weekly` (chưa dựng) + tính năng mới lịch/PDF, sinh cả báo cáo ngày lẫn báo cáo tuần, **cộng phần quản lý Bảng thông tin nhóm cho riêng dự án này** (mục 3.1) | Xem [REPORT-EXPORT-SPEC.md](REPORT-EXPORT-SPEC.md) |
| 6 | Bàn giao | `HandoffPage.tsx` (form 4 bước) | `handoff.programName === project.name` (cân nhắc đổi sang `programId` cho chuẩn, xem mục 5) |
| 7 | Cuộc họp | `MeetingsPage.tsx` (tóm tắt, action item, câu hỏi mở) | `meeting.programName === project.name` (tương tự, nên đổi sang `programId`) |

> **Không có tab "Cập nhật hằng tuần" độc lập.** Báo cáo tuần không còn là một form nhập liệu riêng (kiểu `WeeklyUpdatesPage.tsx` với luồng nháp/duyệt/công bố) — nó trở thành **báo cáo tự động sinh ra** trong tab "Xuất báo cáo", tổng hợp lại từ các Cập nhật hằng ngày trong 7 ngày của kỳ đó cộng dữ liệu task/risk. Xem [REPORT-EXPORT-SPEC.md](REPORT-EXPORT-SPEC.md) mục 7.

### 3.1 Quản lý "Bảng thông tin nhóm" ngay trong tab Xuất báo cáo

Một nhóm (`Team`) có thể phụ trách **nhiều dự án** (`Team.programNames: string[]`, `src/types/index.ts`), nên "Bảng thông tin của nhóm" (`TeamReportPage.tsx`, `TeamWeeklyReport` type — kết quả nổi bật, khó khăn, ưu tiên tuần tới, ai chưa gửi báo cáo, trạng thái nháp/duyệt/công bố) vốn là dữ liệu **theo nhóm**, không theo 1 dự án. Yêu cầu bổ sung: bên trong tab "Xuất báo cáo" của **từng dự án**, cũng xem/quản lý được đúng phần của Bảng thông tin nhóm liên quan tới dự án đang xem — không phải xoá bỏ trang tổng theo nhóm, mà thêm một lát cắt theo dự án.

Để lọc được theo dự án, `TeamWeeklyReport` cần gắn nhãn dự án vào từng mục thay vì chỉ là mảng chuỗi phẳng:

```ts
interface TeamReportItem {
  text: string;
  programId?: string; // gắn với 1 dự án cụ thể trong số các dự án nhóm phụ trách; để trống nếu là ý chung toàn nhóm
}

interface TeamWeeklyReport {
  id: string;
  teamId: string;
  teamName: string;
  week: string;
  memberSubmissions: TeamMemberSubmission[];
  highlights: TeamReportItem[];      // đổi từ string[]
  issues: TeamReportItem[];          // đổi từ string[]
  nextPriorities: TeamReportItem[];  // đổi từ string[]
  status: TeamReportStatus;
}
```

Trong tab "Xuất báo cáo" của dự án, thêm khối "Bảng thông tin nhóm":
- Lọc `highlights`/`issues`/`nextPriorities` có `programId === project.id`, hiển thị cùng layout `StatCard`/`Section` đã có ở `TeamReportPage.tsx`.
- Cho phép thêm/sửa/xoá mục gắn nhãn dự án này trực tiếp tại đây (team lead phụ trách dự án thao tác mà không cần vào trang nhóm tổng).
- Hiển thị submission status của các thành viên đang có task trong dự án này (subset của `memberSubmissions`).
- Nút Duyệt/Công bố (`approveTeamReport`/`publishTeamReport`) áp dụng cho **toàn bộ báo cáo của nhóm** (không tách theo dự án được vì trạng thái `status` là của cả `TeamWeeklyReport`) — nếu dự án này chưa phải người duyệt cuối cùng của nhóm, hiển thị rõ "chờ nhóm duyệt chung" thay vì cho duyệt riêng phần của dự án.
- Trang `/reports/team` (mục 2) tiếp tục là nơi xem toàn cảnh không lọc, xuyên suốt mọi dự án nhóm phụ trách — hai nơi cùng đọc/ghi một `TeamWeeklyReport`, chỉ khác cách lọc hiển thị.

Cần xác định cách map dự án → nhóm: hiện `Project.team` (`src/types/index.ts`) là **tên nhóm** (chuỗi), không phải `teamId`. Nên thêm `Project.teamId` để tra đúng `Team`/`TeamWeeklyReport` thay vì so khớp chuỗi tên (dễ sai nếu trùng/đổi tên nhóm).

Giao diện tab: dùng pattern tab ngang giống các trang khác trong hệ thống (ví dụ tab "Báo cáo nhóm"/"Báo cáo toàn tổ chức" đã có trong `WeeklyUpdatesPage.tsx`) — không cần thư viện mới.

URL: khuyến nghị dùng sub-route thay vì state nội bộ để có thể chia sẻ link/refresh giữ đúng tab, theo đúng nguyên tắc "Filter được lưu trong URL" đã nêu ở `web-user-flows.md` mục 8.9:

```text
/projects/:id                  → Tổng quan (mặc định)
/projects/:id/tasks
/projects/:id/issues
/projects/:id/daily-updates
/projects/:id/reports
/projects/:id/handoff
/projects/:id/meetings
```

## 4. "Cập nhật hằng ngày" — khái niệm mới

**Định nghĩa:** cập nhật hằng ngày = cập nhật **tiến độ task** — hôm nay mỗi người đã thực hiện/hoàn thành được những task nào trong dự án. Đây không phải một bài tường thuật tự do (như `WeeklyUpdate` cũ có `doneItems`/`issues`/`nextSteps`/`supportNeeded` dạng văn bản), mà gắn trực tiếp vào danh sách Nhiệm vụ của dự án — nhẹ, nhanh nhập, gần với việc tick trạng thái task hơn là viết báo cáo.

Đây là **tab duy nhất** cho việc cập nhật tiến độ ở cấp dự án — không có tab "Cập nhật hằng tuần" riêng (xem ghi chú ở mục 3). Báo cáo tuần sẽ do agent tự tổng hợp lại từ 7 ngày Cập nhật hằng ngày, không cần con người tổng hợp thủ công.

Đề xuất model mới `DailyUpdate` (`src/types/index.ts`):

```ts
interface DailyTaskProgress {
  taskId: string;
  taskTitle: string;
  statusBefore: TaskStatus;   // trạng thái đầu ngày
  statusAfter: TaskStatus;    // trạng thái cuối ngày người dùng cập nhật
  note?: string;              // ghi chú ngắn, không bắt buộc
}

interface DailyUpdate {
  id: string;
  userId: string;
  userName: string;
  date: string;          // yyyy-mm-dd
  programId: string;
  taskUpdates: DailyTaskProgress[]; // các task có thay đổi trạng thái hôm nay
  status: 'draft' | 'submitted';
}
```

UI tab "Cập nhật hằng ngày" trong Chi tiết dự án:
- Với người dùng: danh sách task được giao trong dự án hôm nay, tick nhanh trạng thái mới (Chưa làm/Đang làm/Xong/Bị chặn) + ô ghi chú ngắn không bắt buộc cho từng task, nút "Gửi cập nhật hôm nay".
- Với trưởng nhóm/điều phối: view tổng hợp trong ngày — ai đã/chưa gửi cập nhật, bao nhiêu task chuyển sang Xong/Bị chặn hôm nay, nút nhắc nhở người chưa gửi (tái dùng UX "sendReminders" đã có trong `services/updates.service.ts`).
- Đây là dữ liệu **đầu vào** cho cả báo cáo hằng ngày lẫn báo cáo hằng tuần tự động (không phải bản thân báo cáo) — xem [REPORT-EXPORT-SPEC.md](REPORT-EXPORT-SPEC.md) mục 7 về việc agent dùng nguồn này để sinh nội dung.

## 5. Việc cần sửa trong code

1. `navConfig.ts` — xoá 5 `NavLeaf` (Nhiệm vụ, Cập nhật hằng tuần, Khó khăn, Cuộc họp, Bàn giao), đổi label `Chương trình` → `Công việc`; **giữ lại** `NavLeaf` của Báo cáo hằng tuần (`/reports/weekly`) và Bảng thông tin của nhóm (`/reports/team`) nhưng cập nhật `blurb`/`features` theo vai trò tổng hợp mới (mục 2).
2. `App.tsx` — bỏ route `/tasks`, `/weekly-updates`, `/issues`, `/meetings`, `/handoff`; **giữ** route `/reports/weekly` (thay `PlaceholderPage` bằng trang tổng hợp thật) và `/reports/team`; thêm sub-route `/projects/:id/*` cho các tab.
3. `ProjectDetailPage.tsx` — chuyển thành shell chứa tab, mỗi tab render lại component từ trang cũ nhưng nhận `projectId` làm prop bắt buộc và filter dữ liệu tương ứng thay vì đọc toàn bộ danh sách.
4. `services/issues.service.ts`, `services/meetings.service.ts`, `services/handoff.service.ts` — thêm tham số `projectId` cho hàm list, lọc phía service thay vì phía component (giữ component thuần hiển thị).
5. `services/updates.service.ts` — bỏ hàm liên quan `WeeklyUpdate` cá nhân dạng tường thuật tự do (`getTeamWeeklyReport` phiên bản cũ dựa trên `WeeklyUpdate`) nếu không còn nơi nào dùng sau khi chuyển sang `DailyUpdate` (mục 4); thêm `listDailyUpdates(projectId, date)`, `submitDailyUpdate(...)`, `sendReminders(projectId, date)`. **Giữ lại và mở rộng** `getTeamReport(teamId)`, `approveTeamReport`, `publishTeamReport` cho `TeamWeeklyReport` (mục 3.1) — đổi `highlights`/`issues`/`nextPriorities` từ `string[]` sang `TeamReportItem[]` có `programId`, thêm `getTeamReportForProject(projectId)` để tab "Xuất báo cáo" lọc đúng phần của dự án.
6. `Project` trong `types/index.ts` — thêm field `teamId` (hiện chỉ có `team: string` là tên nhóm); `Handoff`, `Meeting` đang lưu `programName` (chuỗi tên) — nên đổi sang `programId` để lọc chính xác, tránh trùng tên dự án gây lọc sai. Có thể giữ các field tên cũ để hiển thị.
7. Nếu backend thật (`lambdas/api/handler.py`) sau này thay thế mock, các endpoint mới cần theo dạng `GET /v1/projects/{projectId}/issues`, `/handoffs`, `/meetings`, `/daily-updates`, `/team-report` — nhất quán với các endpoint dự án đã có (`/v1/projects/{projectId}/tasks`, `/risks`, `/milestones` trong `docs/api.md`).

## 6. Không đổi — vì sao

- **Quyết định (`/decisions`)**: người dùng không liệt kê mục này trong yêu cầu; giữ nguyên ở sidebar.
- **`/reports/leadership`, `/reports/exported`**: view **tổng hợp toàn tổ chức** (nhiều dự án, nhiều nhóm), không gắn với 1 dự án cụ thể nên không thể chuyển hẳn vào Chi tiết dự án.
- **`/reports/weekly`, `/reports/team`**: không xoá, chỉ đổi vai trò thành trang tổng hợp/chỉ đọc xuyên nhiều dự án — xem bảng vai trò mới ở mục 2 và phần quản lý theo-dự-án tương ứng ở mục 3.1.
- **`/my-tasks`, `/my-updates`**: phạm vi cá nhân xuyên nhiều dự án, không phải nội dung của riêng một dự án.

## 7. Acceptance criteria

- Sidebar không còn 5 mục đã liệt kê ở mục 2 (Nhiệm vụ, Cập nhật hằng tuần, Khó khăn, Cuộc họp, Bàn giao); nhóm "Điều phối công việc" chỉ còn "Công việc" và "Quyết định". `/reports/weekly` và `/reports/team` **vẫn còn** trên sidebar.
- Vào `/projects/:id` thấy đủ 7 tab theo đúng thứ tự mục 3 (không có tab "Cập nhật hằng tuần" riêng), mỗi tab chỉ hiển thị dữ liệu của đúng dự án đang xem.
- Refresh trang ở một tab con (`/projects/:id/issues`) vẫn giữ đúng tab, không quay về Tổng quan.
- Không còn cách nào từ UI truy cập được danh sách Nhiệm vụ/Khó khăn/Cuộc họp/Bàn giao **không lọc theo dự án**.
- `/reports/weekly` hiển thị đúng danh sách **tất cả dự án** kèm trạng thái báo cáo tuần mới nhất, bấm vào 1 dòng dẫn thẳng tới tab "Xuất báo cáo" của đúng dự án đó.
- `/reports/team` vẫn hoạt động như hiện tại (chọn nhóm, xem toàn cảnh không lọc); tab "Xuất báo cáo" trong Chi tiết dự án hiển thị đúng lát cắt của Bảng thông tin nhóm đã lọc theo `programId` của dự án đang xem, và việc thêm/sửa mục gắn nhãn dự án ở đây phản ánh ngay sang `/reports/team`.
- Các action hiện có trên từng trang cũ (đổi trạng thái task, xác nhận khó khăn, duyệt báo cáo, xác nhận bàn giao, xác nhận action item cuộc họp) hoạt động y hệt bên trong tab, không mất tính năng.
