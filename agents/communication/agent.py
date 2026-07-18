import time
from typing import Any

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
from agents.common.model.provider import get_strands_model
from agents.common.clients.mcp_client import fetch_mcp_tools_for_target


def create_communication_agent(slack_client: Any = None, mcp_tools: list = None) -> Agent:
    """Create a Strands Agent for communication/drafting using ONLY MCP Tools."""
    mcp_tools = mcp_tools or []

    @tool
    def fallback_status() -> str:
        """Sử dụng khi không có công cụ Slack MCP nào khả dụng."""
        return "Lỗi: Không thể kết nối tới Slack qua MCP Gateway. Vui lòng kiểm tra lại kết nối."

    tools = mcp_tools if mcp_tools else [fallback_status]
    model = get_strands_model()
    
    system_prompt = (
        "Bạn là trợ lý liên lạc của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
        "Bạn được kết nối trực tiếp với hệ thống Slack thông qua các công cụ MCP.\n"
        "LUÔN sử dụng các công cụ MCP này để gửi tin nhắn hoặc lấy thông tin từ kênh Slack.\n"
        "KHÔNG TỰ BỊA RA DỮ LIỆU HOẶC GIẢ LẬP VIỆC GỬI TIN NHẮN. Bắt buộc phải dùng công cụ.\n"
        "LUÔN trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp.\n"
        "Khi soạn tin nhắn: ngắn gọn, rõ ràng, đúng trọng tâm.\n"
        "Giọng điệu phù hợp với tổ chức phi lợi nhuận: thân thiện nhưng chuyên nghiệp."
    )

    return Agent(
        name="communication",
        model=model,
        tools=tools,
        system_prompt=system_prompt,
    )


class CommunicationAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self, model_provider=None, slack_client: Any = None):
        self._slack_client = slack_client

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            mcp_tools = await fetch_mcp_tools_for_target("slack")
            agent = create_communication_agent(slack_client=self._slack_client, mcp_tools=mcp_tools)
            prompt = (
                f"Yêu cầu từ người dùng: {request.instructions}\n"
                f"Ngữ cảnh: {request.inputs}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.completed,
                summary=response_text,
                facts=[Fact(key="draft", value=response_text)],
                citations=[], proposed_actions=[], artifacts=[],
                warnings=[], confidence=1.0, retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.failed,
                summary=f"Liên lạc thất bại: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
