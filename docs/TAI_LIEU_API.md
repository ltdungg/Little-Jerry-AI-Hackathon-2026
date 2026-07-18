# Tài Liệu REST API

## Tổng Quan

REST API qua Amazon API Gateway, xử lý bởi Lambda handler chính với **80+ routes**.

**Base URL:** `https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/prod`
**Xác thực:** JWT Token từ Amazon Cognito (`Authorization: Bearer <token>`)

## Phân Loại Routes

### Auth
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| POST | `/v1/auth/login` | Đăng nhập (email + password) |
| POST | `/v1/auth/refresh` | Làm mới token |

### Health
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/health` | Kiểm tra sức khỏe API |

### Chat & Workflows
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| POST | `/v1/chat` | Gửi tin nhắn chat (gọi Orchestrator Agent) |
| GET | `/v1/chat/sessions` | Liệt kê phiên chat |
| PATCH | `/v1/chat/sessions/{id}` | Đổi tên phiên chat |
| POST | `/v1/workflows` | Tạo workflow |
| POST | `/v1/workflows/{id}/confirm` | Xác nhận workflow |
| POST | `/v1/workflows/{id}/cancel` | Hủy workflow |

### Projects
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects` | Liệt kê dự án |
| GET | `/v1/projects/{id}` | Chi tiết dự án |
| POST | `/v1/projects` | Tạo dự án |
| PATCH | `/v1/projects/{id}` | Cập nhật dự án |
| DELETE | `/v1/projects/{id}` | Xóa dự án |

### Tasks (Jira)
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects/{id}/tasks` | Liệt kê tasks (lọc theo status/assignee/priority) |
| GET | `/v1/projects/{id}/tasks/{tid}` | Chi tiết task |
| POST | `/v1/projects/{id}/tasks` | Tạo task |
| PATCH | `/v1/projects/{id}/tasks/{tid}` | Cập nhật task |
| DELETE | `/v1/projects/{id}/tasks/{tid}` | Xóa task |

### Risks
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects/{id}/risks` | Liệt kê rủi ro (lọc theo severity) |
| GET | `/v1/projects/{id}/risks/{rid}` | Chi tiết rủi ro |
| POST | `/v1/projects/{id}/risks` | Tạo rủi ro mới |
| PATCH | `/v1/projects/{id}/risks/{rid}` | Cập nhật rủi ro |

### Milestones
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects/{id}/milestones` | Liệt kê milestones |
| POST | `/v1/projects/{id}/milestones` | Tạo milestone |
| PATCH | `/v1/projects/{id}/milestones/{mid}` | Cập nhật milestone |

### Issues & Decisions
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects/{id}/issues` | Liệt kê issues |
| POST | `/v1/projects/{id}/issues` | Tạo issue |
| PATCH | `/v1/projects/{id}/issues/{iid}` | Cập nhật issue |
| GET | `/v1/projects/{id}/decisions` | Liệt kê quyết định |
| POST | `/v1/projects/{id}/decisions` | Tạo quyết định |

### Reports
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects/{id}/reports` | Liệt kê báo cáo |
| POST | `/v1/projects/{id}/reports` | Tạo báo cáo (daily/weekly/risk/progress) |
| GET | `/v1/projects/{id}/reports/{rid}` | Chi tiết báo cáo |
| PATCH | `/v1/projects/{id}/reports/{rid}` | Cập nhật báo cáo |
| GET | `/v1/projects/{id}/reports/{rid}/export` | Xuất PDF (trả về presigned URL S3) |

### Teams
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/teams` | Liệt kê nhóm |
| GET | `/v1/teams/{id}` | Chi tiết nhóm |
| POST | `/v1/teams` | Tạo nhóm |
| GET | `/v1/teams/{id}/reports` | Báo cáo nhóm |
| POST | `/v1/teams/{id}/reports/{rid}/approve` | Duyệt báo cáo |
| POST | `/v1/teams/{id}/reports/{rid}/publish` | Đăng báo cáo |

### Users & Admin
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/users` | Liệt kê người dùng |
| GET | `/v1/users/{id}` | Hồ sơ người dùng |
| POST | `/v1/admin/users` | Tạo người dùng (Cognito) |

### Weekly Updates
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/weekly-updates` | Liệt kê cập nhật tuần |
| POST | `/v1/weekly-updates` | Lưu bản nháp |
| POST | `/v1/weekly-updates/{id}/submit` | Nộp bản cập nhật |

### Meetings
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/projects/{id}/meetings` | Liệt kê cuộc họp |
| POST | `/v1/meetings/{id}/action-items/{iid}/confirm` | Xác nhận action item |
| POST | `/v1/meetings/{id}/action-items/{iid}/reject` | Từ chối action item |

### Documents, Handoffs, Roles, Onboarding
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/documents` | Liệt kê tài liệu |
| PATCH | `/v1/documents/{id}` | Cập nhật tài liệu |
| GET | `/v1/handoffs` | Liệt kê bàn giao |
| POST | `/v1/handoffs/{id}/confirm` | Xác nhận hoàn thành |
| GET | `/v1/offboarding` | Liệt kê offboarding |
| GET | `/v1/roles` | Liệt kê vai trò |
| PATCH | `/v1/roles/{id}/permissions/{pid}` | Bật/tắt permission |
| GET | `/v1/onboarding/content` | Nội dung onboarding |
| GET | `/v1/onboarding/checklist` | Checklist onboarding |

### Khác
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/v1/activity-log` | Nhật ký hoạt động |
| GET | `/v1/saved-answers` | Câu trả lời đã lưu |
| POST | `/v1/saved-answers` | Lưu câu trả lời |
| DELETE | `/v1/saved-answers/{id}` | Xóa câu trả lời |
| GET | `/v1/projects/{id}/daily-updates` | Cập nhật hàng ngày |
| POST | `/v1/projects/{id}/daily-updates` | Nộp cập nhật hàng ngày |
| GET | `/v1/admin/oauth/jira/login` | Đăng nhập Jira OAuth |
| GET | `/v1/admin/oauth/slack/login` | Đăng nhập Slack OAuth |

## Mã Lỗi

| Mã | Ý Nghĩa |
|----|---------|
| 200 | Thành công |
| 201 | Tạo thành công |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 409 | Xung đột (duplicate) |
| 500 | Lỗi server |
