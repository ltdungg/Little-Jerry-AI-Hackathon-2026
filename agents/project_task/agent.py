import json
import os
import time
import uuid

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.model.provider import get_strands_model


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


async def create_project_task_agent(tenant_id: str = "aiv", project_id: str | None = None) -> Agent:
    """Create a Strands Agent for project task management using Jira MCP Gateway."""
    from agents.common.clients.mcp_client import fetch_mcp_tools_for_target
    
    # Fetch tools from Jira MCP Gateway
    mcp_tools = await fetch_mcp_tools_for_target("jira")

    model = get_strands_model()
    return Agent(
        name="project_task",
        model=model,
        tools=mcp_tools,
        system_prompt=(
            "Bạn là trợ lý quản lý task dự án của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.\n\n"
            "ĐỊNH DẠNG TRẢ LỜI:\n"
            "- Khi liệt kê task: dùng bullet points, mỗi task gồm: tiêu đề, trạng thái, mức ưu tiên, người phụ trách, hạn chót.\n"
            "- Đánh dấu rõ task quá hạn (dùng **QUÁ HẠN**).\n"
            "- Thống kê tổng quan: tổng số task, số chưa hoàn thành, số quá hạn.\n"
            "- Kết thúc bằng câu hỏi hỗ trợ thêm nếu phù hợp.\n\n"
            "QUY TẮC:\n"
            "- Khi tạo/sửa task, luôn thông báo cần xác nhận trước khi áp dụng.\n"
            "- Dựa trên dữ liệu thực tế, KHÔNG bịa đặt thông tin task.\n"
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
            agent = await create_project_task_agent(tenant_id=tenant_id, project_id=project_id)

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
