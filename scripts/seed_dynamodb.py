"""Seed BusinessData table with demo data for the single-tenant AIV deployment.

Usage: uv run python scripts/seed_dynamodb.py
Requires AWS credentials + BUSINESS_TABLE env (defaults to npo-ai-dev-business-data).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("BUSINESS_TABLE", "npo-ai-dev-business-data")
os.environ.setdefault("AWS_REGION", "ap-southeast-2")

from agents.common.clients.dynamodb_client import BusinessDataClient  # noqa: E402

TENANT = "aiv"

PROJECTS = [
    {
        "project_id": "proj-green-hope",
        "name": "Green Hope Environmental Initiative",
        "program_name": "Chương trình Phủ xanh Việt Nam",
        "description": "Community environmental restoration and sustainability program",
        "status": "active",
        "health": "amber",
        "manager": {"user_id": "user-minh", "display_name": "Minh Nguyen"},
        "overdue_task_count": 1,
        "high_risk_count": 1,
        "start_date": "2025-09-01",
        "end_date": "2026-08-31",
        "tags": ["community", "environment"],
        "updated_at": "2026-07-17T00:00:00Z",
    },
    {
        "project_id": "proj-ocean-rescue",
        "name": "Ocean Rescue Marine Conservation",
        "program_name": "Chương trình Làm sạch Đại dương",
        "description": "Marine ecosystem protection and coastal cleanup operations",
        "status": "active",
        "health": "green",
        "manager": {"user_id": "user-sarah", "display_name": "Sarah Pham"},
        "overdue_task_count": 0,
        "high_risk_count": 0,
        "start_date": "2025-11-01",
        "end_date": "2026-10-31",
        "tags": ["ocean", "conservation"],
        "updated_at": "2026-07-17T00:00:00Z",
    },
]

TASKS = [
    {"task_id": "task-001", "project_id": "proj-green-hope", "title": "Finalize volunteer schedule", "status": "done", "priority": "medium", "due_date": "2026-02-15", "assignee": {"user_id": "user-sarah", "display_name": "Sarah Pham"}, "version": 1, "updated_at": "2026-02-10T00:00:00Z", "allowed_actions": []},
    {"task_id": "task-002", "project_id": "proj-green-hope", "title": "Submit grant application", "status": "in_progress", "priority": "high", "due_date": "2026-08-01", "assignee": {"user_id": "user-minh", "display_name": "Minh Nguyen"}, "version": 1, "updated_at": "2026-07-10T00:00:00Z", "allowed_actions": ["update"]},
    {"task_id": "task-004", "project_id": "proj-green-hope", "title": "Prepare quarterly report", "status": "todo", "priority": "critical", "due_date": "2026-06-01", "is_overdue": True, "assignee": {"user_id": "user-lina", "display_name": "Lina Le"}, "version": 1, "updated_at": "2026-06-01T00:00:00Z", "allowed_actions": ["update"]},
    {"task_id": "task-003", "project_id": "proj-ocean-rescue", "title": "Conduct site assessment", "status": "todo", "priority": "medium", "due_date": "2026-09-10", "assignee": {"user_id": "user-sarah", "display_name": "Sarah Pham"}, "version": 1, "updated_at": "2026-07-01T00:00:00Z", "allowed_actions": ["update"]},
]

RISKS = [
    {"risk_id": "risk-001", "project_id": "proj-green-hope", "title": "Volunteer attrition during summer", "status": "open", "category": "staffing", "likelihood": 4, "impact": 4, "score": 16, "severity": "high", "owner": {"user_id": "user-minh", "display_name": "Minh Nguyen"}, "mitigation": "Recruit backup volunteers", "review_date": "2026-08-01"},
    {"risk_id": "risk-002", "project_id": "proj-ocean-rescue", "title": "Funding gap for Q3", "status": "mitigating", "category": "finance", "likelihood": 3, "impact": 3, "score": 9, "severity": "medium", "owner": {"user_id": "user-sarah", "display_name": "Sarah Pham"}, "mitigation": "Apply for emergency grant", "review_date": "2026-09-01"},
]

MILESTONES = [
    {"milestone_id": "mil-001", "project_id": "proj-green-hope", "name": "Training rollout completed", "status": "in_progress", "health": "amber", "target_date": "2026-09-30", "owner": {"user_id": "user-minh", "display_name": "Minh Nguyen"}},
    {"milestone_id": "mil-002", "project_id": "proj-ocean-rescue", "name": "Coastal cleanup phase 1", "status": "not_started", "health": "green", "target_date": "2026-10-15", "owner": {"user_id": "user-sarah", "display_name": "Sarah Pham"}},
]

ISSUES = [
    {"issue_id": "issue-001", "project_id": "proj-green-hope", "title": "Nhà tài trợ chậm giải ngân đợt 2", "description": "Grant giai đoạn 2 chưa được giải ngân, ảnh hưởng lịch mua vật tư.", "reporter_name": "Minh Nguyen", "owner_id": "user-minh", "owner_name": "Minh Nguyen", "detected_at": "2026-07-10T00:00:00Z", "due_date": "2026-07-25", "impact": "high", "status": "in_progress", "source": "manual", "resolution_plan": "Liên hệ nhà tài trợ để xác nhận mốc giải ngân."},
    {"issue_id": "issue-002", "project_id": "proj-green-hope", "title": "Thiếu tình nguyện viên khu vực phía Bắc", "description": "Phát hiện từ hoạt động Slack: nhóm đang chờ phê duyệt bổ sung nhân sự.", "reporter_name": "Trợ lý AIV", "owner_id": None, "owner_name": None, "detected_at": "2026-07-16T00:00:00Z", "due_date": "2026-07-30", "impact": "critical", "status": "new", "source": "ai_suggested", "ai_evidence": {"snippet": "đang chờ phê duyệt thêm 3 tình nguyện viên cho đợt trồng cây tháng 8", "source": "Slack"}, "resolution_plan": ""},
    {"issue_id": "issue-003", "project_id": "proj-ocean-rescue", "title": "Thiết bị lặn khảo sát chưa được bảo trì", "description": "Thiết bị lặn dùng cho khảo sát rạn san hô quá hạn bảo trì định kỳ.", "reporter_name": "Sarah Pham", "owner_id": "user-sarah", "owner_name": "Sarah Pham", "detected_at": "2026-07-05T00:00:00Z", "due_date": None, "impact": "medium", "status": "investigating", "source": "manual", "resolution_plan": "Đặt lịch bảo trì với nhà cung cấp thiết bị."},
]

DECISIONS = [
    {"decision_id": "dec-001", "project_id": "proj-green-hope", "title": "Chọn nhà cung cấp cây giống mới", "content": "Chuyển sang nhà cung cấp cây giống địa phương thay vì nhập từ tỉnh khác.", "decided_at": "2026-07-01T00:00:00Z", "owner_name": "Minh Nguyen", "approver_name": "Minh Nguyen", "participants": ["Minh Nguyen"], "reason": "Giảm chi phí vận chuyển và tỷ lệ cây chết khi vận chuyển xa.", "alternatives_considered": ["Giữ nhà cung cấp cũ", "Nhập giống từ nước ngoài"], "expected_impact": "Giảm 20% chi phí cây giống, rút ngắn thời gian giao hàng.", "follow_up_tasks": [], "approval_status": "confirmed", "effective_status": "active", "superseded_by_title": None},
    {"decision_id": "dec-002", "project_id": "proj-green-hope", "title": "Hoãn đợt trồng cây tháng 8 sang tháng 9", "content": "Đề xuất dời lịch trồng cây do thiếu tình nguyện viên.", "decided_at": "", "owner_name": "Trợ lý AIV", "approver_name": None, "participants": ["Minh Nguyen"], "reason": "Thiếu nhân sự tình nguyện viên khu vực phía Bắc (xem Khó khăn issue-002).", "alternatives_considered": ["Giữ nguyên lịch, giảm quy mô"], "expected_impact": "Trì hoãn 1 tháng nhưng đảm bảo đủ nhân lực thực hiện.", "follow_up_tasks": [], "approval_status": "ai_suggested", "effective_status": "active", "superseded_by_title": None},
    {"decision_id": "dec-003", "project_id": "proj-ocean-rescue", "title": "Dùng thuyền thuê thay vì mua mới", "content": "Thuê thuyền khảo sát theo đợt thay vì đầu tư mua thuyền riêng.", "decided_at": "2026-06-15T00:00:00Z", "owner_name": "Sarah Pham", "approver_name": "Sarah Pham", "participants": ["Sarah Pham"], "reason": "Tần suất khảo sát thấp, thuê linh hoạt hơn về chi phí vận hành.", "alternatives_considered": ["Mua thuyền mới"], "expected_impact": "Tiết kiệm chi phí bảo trì dài hạn.", "follow_up_tasks": [], "approval_status": "confirmed", "effective_status": "active", "superseded_by_title": None},
]

NOTIFICATIONS = [
    {"user_id": "user-minh", "notification_id": "notif-001", "type": "issue_new", "title": "Khó khăn mới do AI đề xuất", "message": "Trợ lý AI phát hiện 1 khó khăn mới trong Green Hope Environmental Initiative.", "is_read": False, "created_at": "2026-07-16T01:00:00Z", "link": "/issues"},
    {"user_id": "user-minh", "notification_id": "notif-002", "type": "task_overdue", "title": "Nhiệm vụ quá hạn", "message": "\"Prepare quarterly report\" đã quá hạn.", "is_read": False, "created_at": "2026-07-15T00:00:00Z", "link": "/my-tasks"},
    {"user_id": "user-minh", "notification_id": "notif-003", "type": "decision_pending", "title": "Quyết định chờ duyệt", "message": "Quyết định \"Hoãn đợt trồng cây tháng 8 sang tháng 9\" đang chờ bạn phê duyệt.", "is_read": True, "created_at": "2026-07-14T00:00:00Z", "link": "/decisions"},
]

TEAMS = [
    {"team_id": "team-green", "name": "Environment", "mission": "Phục hồi và bảo vệ môi trường cộng đồng.", "program_names": ["Green Hope Environmental Initiative"], "members": [
        {"user_id": "user-minh", "name": "Minh Nguyen", "initials": "MN", "role_label": "Trưởng nhóm"},
        {"user_id": "user-lina", "name": "Lina Le", "initials": "LL", "role_label": "Tình nguyện viên"},
    ], "status": "needs_support", "last_report_at": "2026-07-16T00:00:00Z"},
    {"team_id": "team-ocean", "name": "Marine Conservation", "mission": "Bảo tồn hệ sinh thái biển và làm sạch bờ biển.", "program_names": ["Ocean Rescue Marine Conservation"], "members": [
        {"user_id": "user-sarah", "name": "Sarah Pham", "initials": "SP", "role_label": "Trưởng nhóm"},
    ], "status": "active", "last_report_at": "2026-07-15T00:00:00Z"},
]

USER_PROFILES = [
    {"user_id": "user-minh", "name": "Minh Nguyen", "email": "minh.nguyen@aiv.org", "role": "team_lead", "role_label": "Trưởng nhóm", "team_name": "Environment", "program_names": ["Green Hope Environmental Initiative"], "kind": "staff", "status": "active", "start_date": "2025-01-10", "end_date": None},
    {"user_id": "user-sarah", "name": "Sarah Pham", "email": "sarah.pham@aiv.org", "role": "team_lead", "role_label": "Trưởng nhóm", "team_name": "Marine Conservation", "program_names": ["Ocean Rescue Marine Conservation"], "kind": "staff", "status": "active", "start_date": "2025-03-01", "end_date": None},
    {"user_id": "user-lina", "name": "Lina Le", "email": "lina.le@aiv.org", "role": "volunteer", "role_label": "Tình nguyện viên", "team_name": "Environment", "program_names": ["Green Hope Environmental Initiative"], "kind": "volunteer", "status": "active", "start_date": "2026-02-01", "end_date": "2026-07-31"},
]

WEEKLY_UPDATES = [
    {"update_id": "upd-001", "user_id": "user-minh", "user_name": "Minh Nguyen", "week": "2026-W29", "program_ids": ["proj-green-hope"], "done_items": ["Hoàn tất khảo sát địa điểm trồng cây"], "in_progress_items": ["Theo dõi giải ngân grant đợt 2"], "issues": "Nhà tài trợ chậm giải ngân, có thể ảnh hưởng lịch mua vật tư.", "next_steps": "Liên hệ nhà tài trợ tuần sau.", "support_needed": "", "status": "draft", "submitted_at": None},
    {"update_id": "upd-002", "user_id": "user-minh", "user_name": "Minh Nguyen", "week": "2026-W28", "program_ids": ["proj-green-hope"], "done_items": ["Tuyển thêm 2 tình nguyện viên"], "in_progress_items": [], "issues": "", "next_steps": "Chuẩn bị đợt trồng cây tháng 8.", "support_needed": "", "status": "submitted", "submitted_at": "2026-07-12T00:00:00Z"},
]

TEAM_REPORTS = [
    {"report_id": "rep-green-29", "team_id": "team-green", "team_name": "Environment", "week": "2026-W29", "member_submissions": [
        {"user_id": "user-minh", "user_name": "Minh Nguyen", "user_initials": "MN", "submitted": True},
        {"user_id": "user-lina", "user_name": "Lina Le", "user_initials": "LL", "submitted": False},
    ], "highlights": ["Hoàn tất khảo sát địa điểm trồng cây"], "issues": ["Nhà tài trợ chậm giải ngân đợt 2"], "next_priorities": ["Chốt mốc giải ngân với nhà tài trợ"], "status": "draft"},
    {"report_id": "rep-ocean-29", "team_id": "team-ocean", "team_name": "Marine Conservation", "week": "2026-W29", "member_submissions": [
        {"user_id": "user-sarah", "user_name": "Sarah Pham", "user_initials": "SP", "submitted": True},
    ], "highlights": ["Khảo sát rạn san hô hoàn tất đúng hạn"], "issues": [], "next_priorities": ["Đặt lịch bảo trì thiết bị lặn"], "status": "published"},
]

MEETINGS = [
    {"meeting_id": "meet-001", "title": "Họp giao ban tuần — Environment", "date": "2026-07-15", "duration_minutes": 30, "participants": ["Minh Nguyen", "Lina Le"], "team_id": "team-green", "program_name": "Green Hope Environmental Initiative", "summary": "Rà soát tiến độ khảo sát địa điểm và thảo luận về việc chậm giải ngân grant.", "key_topics": ["Giải ngân grant đợt 2", "Tuyển tình nguyện viên"], "proposed_decisions": ["Hoãn đợt trồng cây tháng 8 sang tháng 9"], "action_items": [
        {"action_item_id": "ai-001", "title": "Liên hệ nhà tài trợ xác nhận mốc giải ngân", "owner": "Minh Nguyen", "due_date": "2026-07-22", "status": "confirmed"},
        {"action_item_id": "ai-002", "title": "Đăng tin tuyển tình nguyện viên phía Bắc", "owner": None, "due_date": None, "status": "proposed"},
    ], "open_questions": ["Ngân sách dự phòng nếu grant giải ngân trễ hơn 1 tháng?"]},
]

DOCUMENTS = [
    {"document_id": "doc-001", "title": "Grant_Application_Q3.docx", "team_name": "Environment", "program_name": "Green Hope Environmental Initiative", "kind": "report", "owner": "Minh Nguyen", "updated_at": "2026-07-10T00:00:00Z", "source": "SharePoint", "version": "v2", "status": "active", "ai_flag": None},
    {"document_id": "doc-002", "title": "Quy trình an toàn khảo sát rạn san hô", "team_name": "Marine Conservation", "program_name": "Ocean Rescue Marine Conservation", "kind": "policy", "owner": "Sarah Pham", "updated_at": "2026-06-01T00:00:00Z", "source": "Docs", "version": "v1", "status": "active", "ai_flag": None},
    {"document_id": "doc-003", "title": "Mẫu bàn giao dự án (2024)", "team_name": "Environment", "program_name": None, "kind": "template", "owner": "Minh Nguyen", "updated_at": "2025-11-01T00:00:00Z", "source": "SharePoint", "version": "v1", "status": "maybe_outdated", "ai_flag": "stale"},
]

HANDOFFS = [
    {"handoff_id": "handoff-001", "from_name": "Lina Le", "to_name": None, "team_name": "Environment", "program_name": "Green Hope Environmental Initiative", "current_responsibilities": "Hỗ trợ khảo sát địa điểm và điều phối tình nguyện viên.", "in_progress_work": "Đang tổng hợp danh sách địa điểm trồng cây đợt tới.", "pending_decisions": "", "unresolved_issues": "Chưa có người thay thế phụ trách khảo sát.", "key_contacts": "Minh Nguyen — trưởng nhóm Environment.", "related_docs": "Grant_Application_Q3.docx", "risks": "Có thể gián đoạn tiến độ khảo sát nếu không bàn giao kịp.", "next_steps": "Bàn giao trực tiếp cho người tiếp nhận trước 31/7.", "status": "team_lead_review"},
]

OFFBOARDING_RECORDS = [
    {"offboarding_id": "off-001", "name": "Lina Le", "team_name": "Environment", "access_ends_at": "2026-07-31", "access_to_revoke": ["Kho tài liệu Environment", "Slack #proj-green-hope"], "owned_documents": [], "handoff_complete": False},
]

ROLE_PERMISSIONS = [
    {"role": "leadership", "role_label": "Ban lãnh đạo", "permissions": {"view": True, "create": False, "edit": False, "approve": True, "export": True, "share": True}},
    {"role": "coordinator", "role_label": "Người điều phối hoạt động", "permissions": {"view": True, "create": True, "edit": True, "approve": False, "export": True, "share": True}},
    {"role": "team_lead", "role_label": "Trưởng nhóm / trưởng dự án", "permissions": {"view": True, "create": True, "edit": True, "approve": True, "export": True, "share": True}},
    {"role": "staff", "role_label": "Nhân viên", "permissions": {"view": True, "create": True, "edit": True, "approve": False, "export": False, "share": False}},
    {"role": "volunteer", "role_label": "Tình nguyện viên", "permissions": {"view": True, "create": False, "edit": False, "approve": False, "export": False, "share": False}},
    {"role": "admin", "role_label": "Người quản trị hệ thống", "permissions": {"view": True, "create": True, "edit": True, "approve": True, "export": True, "share": True}},
]

ONBOARDING_CONTENT = {
    "team_name": "Environment",
    "team_intro": "Nhóm Environment phụ trách các chương trình phục hồi môi trường: khảo sát, trồng cây và vận động tài trợ.",
    "program_intro": "Green Hope Environmental Initiative đang ở giai đoạn chuẩn bị đợt trồng cây tiếp theo và chờ giải ngân grant Q3.",
    "contacts": [
        {"name": "Minh Nguyen", "role_label": "Trưởng nhóm", "initials": "MN"},
    ],
    "current_priorities": ["Chốt mốc giải ngân grant đợt 2", "Tuyển thêm tình nguyện viên phía Bắc"],
    "key_decisions": ["Chọn nhà cung cấp cây giống mới"],
    "open_tasks": ["Submit grant application"],
    "required_docs": ["Grant_Application_Q3.docx"],
    "faqs": [
        {"question": "Chương trình Green Hope bắt đầu từ khi nào?", "answer": "Chương trình khởi động từ tháng 9/2025."},
        {"question": "Tôi cần liên hệ ai khi gặp khó khăn?", "answer": "Liên hệ Minh Nguyen — trưởng nhóm Environment."},
    ],
    "glossary": [
        {"term": "Grant", "definition": "Khoản tài trợ không hoàn lại từ nhà tài trợ cho chương trình."},
        {"term": "AIV", "definition": "Tên viết tắt của tổ chức phi lợi nhuận đang vận hành nền tảng này."},
    ],
}

ONBOARDING_CHECKLIST_BY_USER = {
    "user-lina": [
        {"item_id": "chk-1", "label": "Đọc quy trình an toàn khảo sát", "done": True},
        {"item_id": "chk-2", "label": "Gặp trưởng nhóm để nhận nhiệm vụ đầu tiên", "done": True},
        {"item_id": "chk-3", "label": "Tham gia họp giao ban tuần đầu tiên", "done": False},
    ],
}


def main() -> None:
    client = BusinessDataClient(tenant_id=TENANT)
    for p in PROJECTS:
        client.put_project(p)
        print("project:", p["project_id"])
    for t in TASKS:
        client.put_task(t["project_id"], t)
        print("task:", t["task_id"])
    for r in RISKS:
        client.put_risk(r["project_id"], r)
        print("risk:", r["risk_id"])
    for m in MILESTONES:
        client.put_milestone(m["project_id"], m)
        print("milestone:", m["milestone_id"])
    for i in ISSUES:
        client.put_issue(i["project_id"], i)
        print("issue:", i["issue_id"])
    for d in DECISIONS:
        client.put_decision(d["project_id"], d)
        print("decision:", d["decision_id"])
    for n in NOTIFICATIONS:
        client.put_notification(n["user_id"], n)
        print("notification:", n["notification_id"])
    for t in TEAMS:
        client.put_team(t)
        print("team:", t["team_id"])
    for u in USER_PROFILES:
        client.put_user_profile(u)
        print("user_profile:", u["user_id"])
    for wu in WEEKLY_UPDATES:
        client.put_weekly_update(wu["user_id"], wu)
        print("weekly_update:", wu["update_id"])
    for tr in TEAM_REPORTS:
        client.put_team_report(tr["team_id"], tr)
        print("team_report:", tr["report_id"])
    for m in MEETINGS:
        client.put_meeting(m)
        print("meeting:", m["meeting_id"])
    for d in DOCUMENTS:
        client.put_knowledge_document(d)
        print("document:", d["document_id"])
    for h in HANDOFFS:
        client.put_handoff(h)
        print("handoff:", h["handoff_id"])
    for o in OFFBOARDING_RECORDS:
        client.put_offboarding_record(o)
        print("offboarding:", o["offboarding_id"])
    client.put_role_permissions(ROLE_PERMISSIONS)
    print("role_permissions: seeded")
    client.put_onboarding_content(ONBOARDING_CONTENT)
    print("onboarding_content: seeded")
    for user_id, checklist in ONBOARDING_CHECKLIST_BY_USER.items():
        client.put_onboarding_checklist(user_id, checklist)
        print("onboarding_checklist:", user_id)
    print("Seed complete.")


if __name__ == "__main__":
    main()
