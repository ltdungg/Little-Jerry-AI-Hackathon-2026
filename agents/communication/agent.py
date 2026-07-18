import time
from typing import Any

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
from agents.common.model.provider import get_strands_model


async def create_communication_agent(slack_client: Any = None) -> Agent:
    """Create a Strands Agent for communication/drafting using Slack MCP Gateway."""
    from agents.common.clients.mcp_client import fetch_mcp_tools_for_target
    
    # Fetch tools from Slack MCP Gateway
    mcp_tools = await fetch_mcp_tools_for_target("slack")

    model = get_strands_model()
    return Agent(
        name="communication",
        model=model,
        tools=mcp_tools,
        system_prompt=(
            "Bạn là trợ lý liên lạc của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp.\n"
            "Khi soạn tin nhắn: ngắn gọn, rõ ràng, đúng trọng tâm.\n"
            "Khi gửi thông báo: luôn cần xác nhận trước khi thực thi.\n"
            "Giọng điệu phù hợp với tổ chức phi lợi nhuận: thân thiện nhưng chuyên nghiệp."
        ),
    )


class CommunicationAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self, model_provider=None, slack_client: Any = None):
        self._slack_client = slack_client

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            agent = await create_communication_agent(slack_client=self._slack_client)
            prompt = (
                f"Yêu cầu từ người dùng: {request.instructions}\n"
                f"Ngữ cảnh: {request.inputs}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            # Create proposed action with confirmation token
            confirmation_token = f"comm-tok-{int(time.time())}"
            proposed_action = {
                "type": "send_slack_message",
                "draft": response_text,
                "confirmation_token": confirmation_token,
            }

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.waiting_for_user,
                summary="Đã tạo bản nháp nội dung liên lạc.",
                facts=[Fact(key="draft", value=response_text)],
                citations=[], proposed_actions=[proposed_action], artifacts=[],
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
