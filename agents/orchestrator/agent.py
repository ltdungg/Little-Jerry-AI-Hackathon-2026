import os
import time

import structlog
from strands import Agent

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, TaskStatus,
)
from agents.common.contracts.context import UserRole
from agents.common.auth.authorization import Capability, has_capability
from agents.common.model.provider import get_strands_model

logger = structlog.get_logger()

# Intent -> required capability (for role-based access control)
INTENT_CAPABILITY: dict[str, Capability] = {
    "knowledge_search": Capability.KNOWLEDGE_READ,
    "task_query": Capability.TASK_READ,
    "task_write": Capability.TASK_WRITE,
    "report_generation": Capability.REPORT_CREATE,
    "communication": Capability.COMM_DRAFT,
}

SYSTEM_PROMPT = (
    "Bạn là Orchestrator — trợ lý điều phối thông minh của nền tảng AI NPO "
    "(tổ chức phi lợi nhuận) tại Việt Nam.\n\n"
    "TRÁCH NHIỆM:\n"
    "- Hiểu rõ ý định của người dùng từ câu hỏi\n"
    "- Gọi đúng agent chuyên biệt để lấy thông tin hoặc thực hiện tác vụ\n"
    "- Tổng hợp kết quả thành câu trả lời đầy đủ, thân thiện, có cấu trúc\n"
    "- Trả lời bằng tiếng Việt, lịch sự và chuyên nghiệp\n\n"
    "CÁC AGENT BẠN CÓ THỂ GỌI:\n"
    "- project_task: Quản lý task/công việc dự án. Dùng khi người dùng hỏi về task, "
    "công việc, trạng thái, tiến độ, quá hạn, hoặc muốn tạo/sửa task.\n"
    "- knowledge: Tra cứu tri thức/tài liệu tổ chức. Dùng khi người dùng hỏi về "
    "chính sách, tài liệu, quyết định, kiến thức chung.\n"
    "- reporting: Tạo báo cáo. Dùng khi người dùng muốn tạo báo cáo, tổng kết, thống kê.\n"
    "- communication: Soạn tin nhắn/thông báo. Dùng khi người dùng muốn soạn nội dung "
    "gửi Slack, email, thông báo.\n\n"
    "QUY TẮC:\n"
    "- Khi người dùng chào hỏi (Hi, Xin chào,...): chào lại thân thiện và giới thiệu "
    "các khả năng của bạn\n"
    "- Khi người dùng cảm ơn: đáp lại lịch sự\n"
    "- Luôn dựa trên dữ liệu thực tế từ agent, KHÔNG bịa đặt thông tin\n"
    "- Trình bày câu trả lời có cấu trúc, dễ đọc\n"
    "- Nếu không chắc chắn, hỏi lại người dùng để làm rõ"
)


def _resolve_role(request: AgentTaskRequest) -> UserRole:
    raw = request.constraints.user_role if request.constraints else "volunteer"
    try:
        return UserRole(raw)
    except ValueError:
        return UserRole.volunteer


class OrchestratorAgent:
    """Strands-based orchestrator that delegates to specialist agents via Agent-as-Tool."""

    def __init__(self):
        self._strands_agent: Agent | None = None

    def _build_strands_agent(self, request: AgentTaskRequest) -> Agent:
        """Build the Strands orchestrator agent with specialist agents as tools."""
        from agents.project_task.agent import create_project_task_agent
        from agents.knowledge.agent import create_knowledge_agent
        from agents.reporting.agent import create_reporting_agent
        from agents.communication.agent import create_communication_agent

        tenant_id = request.constraints.tenant_id if request.constraints else "aiv"
        project_ids = request.constraints.project_ids if request.constraints else []
        project_id = project_ids[0] if project_ids else None

        # Create specialist agents
        task_agent = create_project_task_agent(tenant_id=tenant_id, project_id=project_id)
        knowledge_agent = create_knowledge_agent()
        reporting_agent = create_reporting_agent()
        communication_agent = create_communication_agent()

        model = get_strands_model()

        # Agent-as-Tool: register specialist agents as tools of the orchestrator
        return Agent(
            name="orchestrator",
            model=model,
            tools=[
                task_agent.as_tool(name="project_task", description="Quản lý task/công việc dự án: xem danh sách task, task quá hạn, tạo task mới, cập nhật task"),
                knowledge_agent.as_tool(name="knowledge", description="Tra cứu tri thức và tài liệu của tổ chức: chính sách, quyết định, thông tin nội bộ"),
                reporting_agent.as_tool(name="reporting", description="Tạo báo cáo: báo cáo tuần, tổng kết, thống kê dự án"),
                communication_agent.as_tool(name="communication", description="Soạn tin nhắn và thông báo: soạn nội dung Slack, email, thông báo nội bộ"),
            ],
            system_prompt=SYSTEM_PROMPT,
        )

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            role = _resolve_role(request)
            logger.info("orchestrator_handle", role=role.value, workflow_id=request.workflow_id)

            # Build and cache the Strands agent
            agent = self._build_strands_agent(request)

            # Build the user prompt with context
            prompt = (
                f"Yêu cầu từ người dùng (vai trò: {role.value}):\n"
                f"{request.instructions}"
            )

            # Run the Strands agentic loop — it decides which tools to call
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="orchestrator",
                status=TaskStatus.completed,
                summary=response_text,
                facts=[], citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.9, retryable=False,
                metrics=AgentMetrics(
                    latency_ms=int((time.time() - start) * 1000),
                    input_tokens=0, output_tokens=0,
                ),
            )

        except Exception as e:
            logger.error("orchestrator_error", error=str(e))
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="orchestrator",
                status=TaskStatus.failed,
                summary=f"Lỗi điều phối: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(
                    latency_ms=int((time.time() - start) * 1000),
                    input_tokens=0, output_tokens=0,
                ),
            )
