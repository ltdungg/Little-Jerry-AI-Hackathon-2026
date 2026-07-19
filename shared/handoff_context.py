"""Builds a handoff context snapshot from real DynamoDB data for a departing
employee on one project, then asks Bedrock to write it up as a coherent
handoff document. Same "gather raw data, hand to a formatter" split as
shared/report_generators.py, except the final step is an LLM call instead of
deterministic string-building, since a handoff needs to read as a narrative
for the receiving person rather than a stats dashboard — with a deterministic
Markdown fallback if Bedrock is unavailable, matching the try/except
resilience pattern already used around every AgentCore/Bedrock call in
lambdas/api/handler.py (e.g. handle_chat).
"""
from __future__ import annotations

import asyncio
from typing import Any, Protocol

_STATUS_LABELS = {
    "todo": "Chưa bắt đầu",
    "in_progress": "Đang thực hiện",
    "blocked": "Đang bị chặn",
    "done": "Đã hoàn thành",
}


class HandoffDataClient(Protocol):
    def get_project(self, project_id: str) -> dict[str, Any] | None: ...
    def list_tasks_by_assignee(self, user_id: str) -> list[dict[str, Any]]: ...
    def list_issues(self, project_id: str) -> list[dict[str, Any]]: ...
    def list_knowledge_documents(self) -> list[dict[str, Any]]: ...


def gather_handoff_snapshot(
    project_id: str, user_id: str, user_name: str, client: HandoffDataClient,
) -> dict[str, Any]:
    project = client.get_project(project_id) or {}

    my_tasks = [t for t in client.list_tasks_by_assignee(user_id) if t.get("project_id") == project_id]
    tasks_by_status: dict[str, list[dict]] = {k: [] for k in _STATUS_LABELS}
    for t in my_tasks:
        tasks_by_status.setdefault(t.get("status", "todo"), []).append(t)

    my_issues = [i for i in client.list_issues(project_id) if i.get("owner_id") == user_id]

    # Documents have no owner_id (only a free-text owner name) — best-effort
    # name match, same limitation noted for name-based filtering elsewhere.
    my_docs = [
        d for d in client.list_knowledge_documents()
        if d.get("owner") == user_name and d.get("program_name") == project.get("name")
    ]

    return {
        "project_name": project.get("name", project_id),
        "project_description": project.get("description", ""),
        "project_progress": project.get("progress", 0),
        "project_deadline": project.get("end_date", ""),
        "user_name": user_name,
        "tasks_by_status": tasks_by_status,
        "issues": my_issues,
        "documents": my_docs,
    }


def _fallback_markdown(snapshot: dict[str, Any]) -> str:
    lines = [
        f"# Bàn giao — {snapshot['project_name']}",
        f"**Người bàn giao:** {snapshot['user_name']}",
        f"**Mô tả dự án:** {snapshot['project_description'] or 'Chưa có mô tả'}",
        f"**Tiến độ:** {snapshot['project_progress']}%",
        f"**Deadline:** {snapshot['project_deadline'] or 'Chưa có'}",
        "",
        "## Công việc",
    ]
    for status, label in _STATUS_LABELS.items():
        items = snapshot["tasks_by_status"].get(status, [])
        lines.append(f"- {label}: {len(items)}")
        for t in items[:5]:
            lines.append(f"  - \"{t.get('title', 'N/A')}\"")

    if snapshot["issues"]:
        lines.append("\n## Khó khăn đang phụ trách")
        for i in snapshot["issues"]:
            lines.append(f"- \"{i.get('title', 'N/A')}\" (mức: {i.get('impact', 'N/A')})")

    if snapshot["documents"]:
        lines.append("\n## Tài liệu đang đứng tên")
        for d in snapshot["documents"]:
            lines.append(f"- {d.get('title', 'N/A')}")

    return "\n".join(lines)


def _build_prompt(snapshot: dict[str, Any]) -> str:
    task_lines = [
        f"- [{_STATUS_LABELS[status]}] {t.get('title', 'N/A')}: {t.get('description', '')}"
        for status in _STATUS_LABELS
        for t in snapshot["tasks_by_status"].get(status, [])
    ]
    issue_lines = [
        f"- {i.get('title', 'N/A')} (mức độ: {i.get('impact', 'N/A')}, trạng thái: {i.get('status', 'N/A')})"
        for i in snapshot["issues"]
    ]
    doc_lines = [f"- {d.get('title', 'N/A')}" for d in snapshot["documents"]]

    return (
        "Hãy viết một bản bàn giao công việc mạch lạc, đầy đủ bằng tiếng Việt cho người sắp nghỉ việc, "
        "dựa trên dữ liệu thật dưới đây. Trình bày dạng Markdown với các mục: Tổng quan dự án, "
        "Công việc đang làm/đã làm/chưa làm, Khó khăn/vấn đề cần lưu ý, Tài liệu liên quan, "
        "Bước tiếp theo đề xuất cho người nhận bàn giao.\n\n"
        f"Dự án: {snapshot['project_name']}\n"
        f"Mô tả dự án: {snapshot['project_description'] or 'Không có'}\n"
        f"Tiến độ: {snapshot['project_progress']}%\n"
        f"Deadline: {snapshot['project_deadline'] or 'Không có'}\n"
        f"Người bàn giao: {snapshot['user_name']}\n\n"
        "Công việc:\n" + ("\n".join(task_lines) or "Không có task nào.") + "\n\n"
        "Khó khăn đang phụ trách:\n" + ("\n".join(issue_lines) or "Không có.") + "\n\n"
        "Tài liệu đang đứng tên:\n" + ("\n".join(doc_lines) or "Không có.")
    )


def generate_handoff_context(snapshot: dict[str, Any]) -> str:
    try:
        from agents.common.model.provider import BedrockProvider

        provider = BedrockProvider()
        response = asyncio.run(provider.generate(_build_prompt(snapshot)))
        if response.text.strip():
            return response.text
    except Exception:
        pass
    return _fallback_markdown(snapshot)
