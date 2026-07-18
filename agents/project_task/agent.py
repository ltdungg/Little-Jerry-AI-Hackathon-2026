import json
import os
import time
import uuid

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.model.provider import get_strands_model
from agents.common.clients.mcp_client import fetch_mcp_tools_for_target


def _status_vn(s: str) -> str:
    mapping = {
        "todo": "Cần làm", "in_progress": "Đang thực hiện",
        "blocked": "Bị chặn", "done": "Hoàn thành",
        "cancelled": "Đã hủy", "completed": "Đã hoàn thành",
    }
    return mapping.get(s, s)


def _priority_vn(p: str) -> str:
    mapping = {
        "low": "Thấp", "medium": "Trung bình",
        "high": "Cao", "critical": "Khẩn cấp",
    }
    return mapping.get(p, p)


def _format_task_readable(t: dict, idx: int) -> str:
    title = t.get("title", "Không có tiêu đề")
    status = _status_vn(t.get("status", "unknown"))
    priority = _priority_vn(t.get("priority", "medium"))
    assignee = t.get("assignee", {}).get("display_name", t.get("assignee_user_id", "Chưa phân công"))
    due_date = t.get("due_date", "Không có hạn")
    overdue = " (QUÁ HẠN!)" if t.get("is_overdue", False) else ""
    return (
        f"Task {idx+1}: \"{title}\"\n"
        f"  - Trạng thái: {status}\n"
        f"  - Mức ưu tiên: {priority}\n"
        f"  - Người phụ trách: {assignee}\n"
        f"  - Hạn chót: {due_date}{overdue}"
    )


def create_project_task_agent(tenant_id: str = "aiv", project_id: str | None = None, mcp_tools: list = None) -> Agent:
    """Create a Strands Agent for project task management."""
    client = BusinessDataClient(tenant_id=tenant_id)
    mcp_tools = mcp_tools or []

    @tool
    def list_project_tasks() -> str:
        """Liệt kê tất cả task của dự án hiện tại. Trả về danh sách task với tiêu đề, trạng thái, người phụ trách, hạn chót."""
        tasks = client.list_tasks(project_id) if project_id else client.list_overdue_tasks()
        if not tasks:
            return "Không có task nào."
        lines = [_format_task_readable(t, i) for i, t in enumerate(tasks[:20])]
        return "\n\n".join(lines)

    @tool
    def list_overdue_tasks() -> str:
        """Liệt kê các task đã quá hạn. Trả về danh sách task chưa hoàn thành."""
        tasks = client.list_overdue_tasks()
        if not tasks:
            return "Không có task quá hạn nào."
        lines = [_format_task_readable(t, i) for i, t in enumerate(tasks[:20])]
        return "\n\n".join(lines)

    @tool
    def create_task(title: str, status: str = "todo", due_date: str = "", assignee_user_id: str = "", priority: str = "medium") -> str:
        """Tạo task mới cho dự án. Luôn cần xác nhận trước khi thực thi (dry_run)."""
        if not project_id:
            return "Lỗi: Cần chỉ định project_id để tạo task."
        task_id = str(uuid.uuid4())
        preview = {
            "task_id": task_id, "title": title, "status": status,
            "due_date": due_date or None, "assignee_user_id": assignee_user_id or None,
            "priority": priority,
        }
        return json.dumps({"action": "confirm_task_create", "preview": preview, "message": f"Đề xuất tạo task '{title}'. Xác nhận để áp dụng."}, ensure_ascii=False)

    @tool
    def update_task(task_id: str, title: str = "", status: str = "", due_date: str = "", assignee_user_id: str = "", priority: str = "") -> str:
        """Cập nhật task hiện có. Luôn cần xác nhận trước khi thực thi."""
        if not project_id:
            return "Lỗi: Cần chỉ định project_id để cập nhật task."
        fields = {}
        if title: fields["title"] = title
        if status: fields["status"] = status
        if due_date: fields["due_date"] = due_date
        if assignee_user_id: fields["assignee_user_id"] = assignee_user_id
        if priority: fields["priority"] = priority
        return json.dumps({"action": "confirm_task_update", "task_id": task_id, "updates": fields, "message": f"Đề xuất cập nhật task {task_id}. Xác nhận để áp dụng."}, ensure_ascii=False)

    model = get_strands_model()
    return Agent(
        name="project_task",
        model=model,
        tools=[list_project_tasks, list_overdue_tasks, create_task, update_task] + mcp_tools,
        system_prompt=(
            "Bạn là trợ lý quản lý task dự án của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.\n"
            "Khi liệt kê task: trình bày từng task với tiêu đề, trạng thái, mức ưu tiên, người phụ trách, hạn chót.\n"
            "Nếu có task quá hạn, hãy đánh dấu rõ ràng.\n"
            "Khi tạo/sửa task, luôn thông báo cần xác nhận trước khi áp dụng.\n"
            f"Dự án hiện tại: {project_id or 'chưa xác định'}. Tenant: {tenant_id}."
        ),
    )


class ProjectTaskAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self, data_client: BusinessDataClient | None = None):
        self._data_client = data_client

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        tenant_id = request.constraints.tenant_id if request.constraints else "aiv"
        project_ids = request.constraints.project_ids if request.constraints else []
        project_id = project_ids[0] if project_ids else None

        try:
            mcp_tools = await fetch_mcp_tools_for_target("jira")
            agent = create_project_task_agent(tenant_id=tenant_id, project_id=project_id, mcp_tools=mcp_tools)

            # Build a context-rich prompt for the Strands agent
            prompt = (
                f"Yêu cầu từ người dùng: {request.instructions}\n"
                f"Loại yêu cầu: {request.intent.value}\n"
                f"Dữ liệu bổ sung: {json.dumps(request.inputs, ensure_ascii=False) if request.inputs else 'Không có'}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="project-task-agent",
                status=TaskStatus.completed,
                summary=response_text,
                facts=[Fact(key="answer", value=response_text)],
                citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.9, retryable=False,
                metrics=AgentMetrics(
                    latency_ms=int((time.time() - start) * 1000),
                    input_tokens=0, output_tokens=0,
                ),
            )

        except Exception as e:
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="project-task-agent",
                status=TaskStatus.failed,
                summary=f"Thao tác tác vụ thất bại: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(
                    latency_ms=int((time.time() - start) * 1000),
                    input_tokens=0, output_tokens=0,
                ),
            )
