# Frontend React

## Tổng Quan

Frontend React 19 + Vite + TypeScript + Tailwind CSS. Xác thực qua AWS Amplify (Cognito). State management qua TanStack React Query.

## Trang Chính

| Trang | Route | Chức Năng |
|-------|-------|-----------|
| Đăng nhập | `/login` | Form email + password |
| Trang chủ | `/` | Dashboard tổng quan (stat cards, dự án gần đây, tasks cần xử lý) |
| Dự án | `/projects` | Danh sách dự án |
| Chi tiết dự án | `/projects/:id` | Tabs: Tổng quan, Tasks, Issues, Daily Updates, Reports, Handoff, Meetings |
| Trợ lý AI | `/assistant` | Chat interface với AI (markdown rendering, citations) |
| Quyết định | `/decisions` | Danh sách quyết định dự án |
| Nhóm | `/teams` | Quản lý nhóm, báo cáo nhóm |
| Kiến thức | `/knowledge` | Tài liệu tổ chức |
| Báo cáo tuần | `/reports/weekly` | Tổng hợp báo cáo hàng tuần |
| Nhật ký | `/admin/activity-log` | Theo dõi hoạt động |
| Người dùng | `/admin/users` | Quản lý người dùng |
| Vai trò | `/admin/roles` | Quản lý phân quyền |
| Bàn giao | `/offboarding` | Quản lý bàn giao khi nghỉ việc |
| Thành viên | `/members` | Danh sách thành viên |
| Sơ đồ tổ chức | `/org-chart` | Biểu đồ tổ chức |

## Components Chính

- **Layout:** AppShell (sidebar + topbar), Sidebar, Topbar
- **Common:** Table, StatusBadge, StatCard, SearchInput, Select, PageHeader, EmptyState, Pill, Icon, OrgChart
- **Modals:** CreateProjectModal, CreateTeamModal, CreateMemberModal, AssignModal

## Services (17 service files)

Mỗi service tương ứng một entity: `projects.service.ts`, `tasks.service.ts`, `risks.service.ts`, `chat.service.ts`, `teams.service.ts`, `meetings.service.ts`, `decisions.service.ts`, `documents.service.ts`, `people.service.ts`, `updates.service.ts`, `roles.service.ts`, `notifications.service.ts`, `activityLog.service.ts`, `dailyUpdates.service.ts`, `projectReports.service.ts`, `handoff.service.ts`, `onboarding.service.ts`

Mọi service gọi REST API qua `lib/api.ts`, sử dụng `lib/auth.ts` cho xác thực.

## Thư Mục

```
frontend-reactjs/src/
├── main.tsx, App.tsx, index.css
├── lib/           # api.ts, auth.ts, navConfig.ts
├── types/         # index.ts
├── context/       # AuthContext.tsx, useAuth.ts
├── hooks/         # useMockResource.ts, useMockList.ts
├── services/      # 17 API service files
├── components/
│   ├── common/    # 12 shared components
│   └── layout/    # AppShell, Sidebar, Topbar
└── pages/         # 15+ page components + project-detail/ (7 tabs)
```

## Development

```bash
cd frontend-reactjs
npm install
npm run dev      # http://localhost:5173
npm run build    # Build production
npm run lint     # ESLint
```
