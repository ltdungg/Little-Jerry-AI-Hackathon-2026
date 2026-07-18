"""Pure, deterministic report-content generators built from real DynamoDB data
(no LLM call) — shared by the Reporting Agent (agents/reporting/agent.py,
runs in the AgentCore container) and the API Lambda's manual/scheduled report
routes (lambdas/api/handler.py, lambdas/scheduled/generate_daily_reports.py).

Lives under shared/ (not agents/common/) because both the agents container
Dockerfile and the Lambda container Dockerfile copy shared/ but only the
Lambda copies agents/common/ — agents/reporting itself is never shipped to
the API Lambda image. See docs/REPORT-EXPORT-SPEC.md mục 7.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol


class ReportDataClient(Protocol):
    def get_project(self, project_id: str) -> dict[str, Any] | None: ...
    def list_tasks(self, project_id: str) -> list[dict]: ...
    def list_risks(self, project_id: str) -> list[dict]: ...
    def list_milestones(self, project_id: str) -> list[dict]: ...
    def list_issues(self, project_id: str, status_filter: str | None = None) -> list[dict]: ...


def _format_task_summary(tasks: list[dict]) -> str:
    if not tasks:
        return "Không có task nào."
    total = len(tasks)
    done = sum(1 for t in tasks if t.get("status") in ("done", "completed"))
    overdue = sum(1 for t in tasks if t.get("is_overdue", False))
    in_progress = sum(1 for t in tasks if t.get("status") == "in_progress")
    blocked = sum(1 for t in tasks if t.get("status") == "blocked")
    todo = sum(1 for t in tasks if t.get("status") == "todo")

    lines = [
        f"**Tổng quan task:** {total} task",
        f"- Hoàn thành: {done}/{total} ({done*100//total if total else 0}%)",
        f"- Đang thực hiện: {in_progress}",
        f"- Chờ làm: {todo}",
        f"- Bị chặn: {blocked}",
    ]
    if overdue > 0:
        lines.append(f"- **QUÁ HẠN: {overdue}**")
    return "\n".join(lines)


def _format_risk_summary(risks: list[dict]) -> str:
    if not risks:
        return "Không có rủi ro nào được ghi nhận."
    critical = sum(1 for r in risks if r.get("severity") == "critical")
    high = sum(1 for r in risks if r.get("severity") == "high")
    medium = sum(1 for r in risks if r.get("severity") == "medium")
    low = sum(1 for r in risks if r.get("severity") == "low")
    open_count = sum(1 for r in risks if r.get("status") == "open")

    lines = [
        f"**Tổng quan rủi ro:** {len(risks)} rủi ro ({open_count} đang mở)",
    ]
    if critical:
        lines.append(f"- **Khẩn cấp: {critical}**")
    if high:
        lines.append(f"- Cao: {high}")
    if medium:
        lines.append(f"- Trung bình: {medium}")
    if low:
        lines.append(f"- Thấp: {low}")

    top_risks = sorted(risks, key=lambda r: r.get("score", 0), reverse=True)[:3]
    if top_risks:
        lines.append("\n**3 rủi ro lớn nhất:**")
        for r in top_risks:
            lines.append(
                f"- \"{r.get('title', 'N/A')}\" "
                f"(điểm: {r.get('score', 0)}, "
                f"mức: {r.get('severity', 'N/A')})"
            )
    return "\n".join(lines)


def _format_milestone_summary(milestones: list[dict]) -> str:
    if not milestones:
        return "Không có milestone nào."
    upcoming = [m for m in milestones if m.get("status") not in ("completed", "cancelled")]
    completed = [m for m in milestones if m.get("status") == "completed"]

    lines = [f"**Milestone:** {len(completed)}/{len(milestones)} đã hoàn thành"]
    for m in upcoming[:3]:
        lines.append(
            f"- \"{m.get('name', 'N/A')}\" "
            f"(trạng thái: {m.get('status', 'N/A')}, "
            f"hạn: {m.get('target_date', 'N/A')})"
        )
    return "\n".join(lines)


def generate_daily_status(project_id: str, client: ReportDataClient) -> str:
    """Narrower than weekly_status: only what changed in the last 24h
    (task updates/completions, issues, risks) — see docs/REPORT-EXPORT-SPEC.md mục 7."""
    project = client.get_project(project_id) or {}
    now = datetime.now(timezone.utc)
    cutoff = now.date().isoformat()

    tasks = client.list_tasks(project_id)
    changed_today = [t for t in tasks if (t.get("updated_at") or "")[:10] == cutoff]
    completed_today = [t for t in changed_today if t.get("status") in ("done", "completed")]

    issues_today = [
        i for i in client.list_issues(project_id)
        if (i.get("detected_at") or i.get("created_at") or "")[:10] == cutoff
    ]

    risks = client.list_risks(project_id)
    risks_today = [r for r in risks if (r.get("review_date") or "")[:10] == cutoff]

    lines = [
        f"# Báo cáo ngày — {project.get('name', project_id)}",
        f"**Ngày:** {cutoff}",
        f"**Trạng thái dự án:** {project.get('status', 'N/A')}",
        "",
        "## Cập nhật trong ngày",
        f"- Task có cập nhật: {len(changed_today)}",
        f"- Task hoàn thành: {len(completed_today)}",
    ]
    for t in completed_today[:5]:
        lines.append(f"  - Hoàn thành: \"{t.get('title', 'N/A')}\"")

    if issues_today:
        lines.append(f"\n## Khó khăn mới phát sinh ({len(issues_today)})")
        for i in issues_today[:5]:
            lines.append(f"- \"{i.get('title', 'N/A')}\" (mức: {i.get('impact', 'N/A')})")

    if risks_today:
        lines.append(f"\n## Rủi ro cần xem xét hôm nay ({len(risks_today)})")
        for r in risks_today[:5]:
            lines.append(f"- \"{r.get('title', 'N/A')}\" (mức: {r.get('severity', 'N/A')})")

    if not changed_today and not issues_today and not risks_today:
        lines.append("\nKhông có hoạt động nào được ghi nhận trong ngày.")

    return "\n".join(lines)


def generate_weekly_status(project_id: str, client: ReportDataClient) -> str:
    project = client.get_project(project_id) or {}
    tasks = client.list_tasks(project_id)
    risks = client.list_risks(project_id)
    milestones = client.list_milestones(project_id)

    now = datetime.now(timezone.utc)
    lines = [
        f"# Báo cáo tuần — {project.get('name', project_id)}",
        f"**Ngày tạo:** {now.strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Trạng thái dự án:** {project.get('status', 'N/A')}",
        f"**Sức khỏe:** {project.get('health', 'N/A')}",
        "",
        "## Tiến độ",
        _format_task_summary(tasks),
        "",
        "## Rủi ro",
        _format_risk_summary(risks),
        "",
        "## Milestone",
        _format_milestone_summary(milestones),
    ]
    return "\n".join(lines)


def generate_risk_summary(project_id: str, client: ReportDataClient) -> str:
    risks = client.list_risks(project_id)
    tasks = client.list_tasks(project_id)
    project = client.get_project(project_id) or {}

    now = datetime.now(timezone.utc)
    lines = [
        f"# Báo cáo rủi ro — {project.get('name', project_id)}",
        f"**Ngày tạo:** {now.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Tổng quan",
        _format_risk_summary(risks),
        "",
        "## Rủi ro chi tiết",
    ]

    for r in sorted(risks, key=lambda x: x.get("score", 0), reverse=True):
        lines.append(
            f"\n### {r.get('title', 'N/A')}\n"
            f"- **Mức độ:** {r.get('severity', 'N/A')} (điểm: {r.get('score', 0)})\n"
            f"- **Khả năng xảy ra:** {r.get('likelihood', 'N/A')}/5\n"
            f"- **Tác động:** {r.get('impact', 'N/A')}/5\n"
            f"- **Trạng thái:** {r.get('status', 'N/A')}\n"
            f"- **Chủ sở hữu:** {r.get('owner_user_id', 'N/A')}\n"
            f"- **Giải pháp:** {r.get('mitigation', 'Chưa có')}\n"
            f"- **Ngày xem xét:** {r.get('review_date', 'N/A')}"
        )

    blocked_tasks = [t for t in tasks if t.get("status") == "blocked"]
    if blocked_tasks:
        lines.append("\n## Task bị chặn (liên quan rủi ro)")
        for t in blocked_tasks:
            lines.append(
                f"- \"{t.get('title', 'N/A')}\" — {t.get('blocked_reason', 'Lý do chưa rõ')}"
            )

    return "\n".join(lines)


def generate_progress_summary(project_id: str, client: ReportDataClient) -> str:
    tasks = client.list_tasks(project_id)
    milestones = client.list_milestones(project_id)
    project = client.get_project(project_id) or {}

    now = datetime.now(timezone.utc)
    lines = [
        f"# Báo cáo tiến độ — {project.get('name', project_id)}",
        f"**Ngày tạo:** {now.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Task",
        _format_task_summary(tasks),
        "",
        "## Milestone",
        _format_milestone_summary(milestones),
    ]

    overdue_tasks = [t for t in tasks if t.get("is_overdue", False)]
    if overdue_tasks:
        lines.append("\n## Task quá hạn")
        for t in overdue_tasks:
            lines.append(
                f"- \"{t.get('title', 'N/A')}\" — hạn: {t.get('due_date', 'N/A')}"
            )

    return "\n".join(lines)


REPORT_TITLES = {
    "daily_status": "Báo cáo ngày",
    "weekly_status": "Báo cáo tuần",
    "risk_summary": "Báo cáo rủi ro",
    "progress_summary": "Báo cáo tiến độ",
}

REPORT_GENERATORS = {
    "daily_status": generate_daily_status,
    "weekly_status": generate_weekly_status,
    "risk_summary": generate_risk_summary,
    "progress_summary": generate_progress_summary,
}
