import json
import os
import time
import uuid

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
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
    """Create a Strands Agent for project task management using ONLY MCP Tools."""
    mcp_tools = mcp_tools or []

    @tool
    def fallback_status() -> str:
        """Sử dụng khi không có công cụ Jira MCP nào khả dụng."""
        return "Lỗi: Không thể kết nối tới Jira qua MCP Gateway. Vui lòng kiểm tra lại kết nối."

    tools = mcp_tools if mcp_tools else [fallback_status]
    model = get_strands_model()
    
    system_prompt = (
        "Bạn là trợ lý quản lý task dự án của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
        "Bạn được kết nối trực tiếp với hệ thống Jira thông qua các công cụ MCP (như SearchIssues, GetAllBoards, v.v.).\n"
        "LUÔN sử dụng các công cụ MCP này để tìm kiếm, tạo mới và cập nhật task trên Jira. (Sử dụng JQL khi tìm kiếm, ví dụ: 'project = PROJ-NAME').\n"
        "KHÔNG TỰ BỊA RA DỮ LIỆU. Chỉ trả lời dựa trên kết quả trả về từ Jira MCP.\n"
        "LUÔN trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.\n"
        "Khi liệt kê task: trình bày từng task với tiêu đề, trạng thái, người phụ trách, hạn chót (nhấn mạnh nếu quá hạn).\n"
        f"Dự án hiện tại: {project_id or 'chưa xác định'}. Tenant: {tenant_id}."
    )

    return Agent(
        name="project_task",
        model=model,
        tools=tools,
        system_prompt=system_prompt,
    )


class ProjectTaskAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self):
        pass

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
