# Mô Hình Dữ Liệu

## Tổng Quan

DynamoDB Single-Table Design — tất cả dữ liệu kinh doanh trong một bảng `npo-ai-business-data`.

**Partition Key:** `PK` (String) — luôn bắt đầu bằng `TENANT#{tenant_id}`
**Sort Key:** `SK` (String) — phân biệt loại entity

## Cấu Trúc Key

| Entity | PK | SK |
|--------|----|----|
| Tenant | `TENANT#{id}` | `METADATA` |
| Project | `TENANT#{id}` | `PROJECT#{project_id}` |
| Task | `TENANT#{id}` | `TASK#{project_id}#{task_id}` |
| Risk | `TENANT#{id}` | `RISK#{project_id}#{risk_id}` |
| Milestone | `TENANT#{id}` | `MILESTONE#{project_id}#{milestone_id}` |
| Issue | `TENANT#{id}` | `ISSUE#{project_id}#{issue_id}` |
| Decision | `TENANT#{id}` | `DECISION#{project_id}#{decision_id}` |
| Report | `TENANT#{id}` | `REPORT#{project_id}#{report_id}` |
| User | `TENANT#{id}` | `USER#{user_id}` |
| Team | `TENANT#{id}` | `TEAM#{team_id}` |
| Meeting | `TENANT#{id}` | `MEETING#{project_id}#{meeting_id}` |
| Document | `TENANT#{id}` | `DOCUMENT#{doc_id}` |
| Activity | `TENANT#{id}` | `ACTIVITY#{timestamp}#{activity_id}` |
| Notification | `TENANT#{id}` | `NOTIFICATION#{user_id}#{noti_id}` |
| Metrics | `TENANT#{id}` | `METRICS#{project_id}` |
| Weekly Update | `TENANT#{id}` | `WEEKLY_UPDATE#{user_id}#{week}` |
| Team Report | `TENANT#{id}` | `TEAM_REPORT#{team_id}#{report_id}` |
| Handoff | `TENANT#{id}` | `HANDOFF#{project_id}#{handoff_id}` |
| Offboarding | `TENANT#{id}` | `OFFBOARDING#{user_id}` |
| Role Permission | `TENANT#{id}` | `ROLE_PERMISSION#{role}` |
| Onboarding Content | `TENANT#{id}` | `ONBOARDING_CONTENT` |
| Onboarding Checklist | `TENANT#{id}` | `ONBOARDING_CHECKLIST#{user_id}` |

## Indexes

| Index | GSI1PK | GSI1SK | Mục Đích |
|-------|--------|--------|----------|
| GSI1 | `TENANT#{id}` | `{ENTITY}#{id}#{created_at}#{entity_id}` | Query theo thời gian |

## Trường Chính Của Mỗi Entity

**Project:** name, description, status, health, owner, budget, spent, team_members, start_date, end_date

**Task:** title, description, status, priority, assignee, duedate, jira_key, source (jira/dynamodb)

**Risk:** title, description, severity, likelihood (1-5), impact (1-5), score (likelihood × impact), status, owner, mitigation, review_date

**Issue:** title, description, severity, status, assignee, resolution, ai_suggested

**Decision:** title, description, status, rationale, participants, ai_suggested

**Report:** title, report_type (daily_status/weekly_status/risk_summary/progress_summary), content (Markdown), status, period_start, period_end, s3_key

**User:** cognito_sub, email, display_name, role, team_id, locale, timezone, status

**Team:** name, description, leader, members, status, health

## Bảng Quan Hệ

```
Tenant ──── Project ──── Task (Jira)
              │──── Risk
              │──── Milestone
              │──── Issue
              │──── Decision
              │──── Report
              │──── Meeting

Tenant ──── User ──── UserProfile
              │──── WeeklyUpdate
              │──── TeamReport
              │──── Onboarding

Tenant ──── Team
Tenant ──── Document
Tenant ──── ActivityLog
Tenant ──── Notification
```

## Truy Vấn Phổ Biến

- **Lấy tasks dự án:** Query theo PK + `begins_with(SK, "TASK#{project_id}#")`
- **Lấy risks dự án:** Query theo PK + `begins_with(SK, "RISK#{project_id}#")`
- **Lấy theo thời gian:** Dùng GSI1 với SK chứa timestamp
- **Cross-entity:** Filter contains(SK, "#{project_id}") trên kết quả query

## Best Practices

- Luôn query bằng PK + SK prefix (dùng `begins_with()`)
- Dùng GSI cho query phức tạp, tránh scan toàn bảng
- Single item tối đa 400KB, query result tối đa 1MB
- Denormalize dữ liệu để tối ưu read
