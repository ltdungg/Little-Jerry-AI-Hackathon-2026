import time
from typing import Any

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
from agents.common.model.provider import get_strands_model


def create_reporting_agent(artifact_store: Any = None) -> Agent:
    """Create a Strands Agent for report generation."""

    @tool
    def generate_report(topic: str, format: str = "text") -> str:
        """Tạo báo cáo về chủ đề được chỉ định. Trả về nội dung báo cáo."""
        return (
            f"Báo cáo về '{topic}':\n\n"
            f"Đây là bản nháp báo cáo tự động. "
            f"Nội dung chi tiết sẽ được bổ sung khi có dữ liệu từ các nguồn tri thức và task."
        )

    @tool
    def store_report(content: str, title: str = "Báo cáo tự động") -> str:
        """Lưu báo cáo vào kho lưu trữ. Trả về URI của báo cáo đã lưu."""
        # Placeholder: trong thực tế sẽ upload lên S3
        return f"Đã lưu báo cáo '{title}'. URI: s3://reports/{title.replace(' ', '-')}.md"

    model = get_strands_model()
    return Agent(
        name="reporting",
        model=model,
        tools=[generate_report, store_report],
        system_prompt=(
            "Bạn là trợ lý tạo báo cáo của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.\n"
            "Tạo báo cáo chi tiết, chuyên nghiệp với số liệu cụ thể.\n"
            "Luôn lưu báo cáo sau khi tạo."
        ),
    )


class ReportingAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self, model_provider=None, artifact_store: Any = None):
        self._artifact_store = artifact_store

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            agent = create_reporting_agent(artifact_store=self._artifact_store)
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
                agent_name="reporting-agent",
                status=TaskStatus.completed,
                summary="Đã tạo báo cáo thành công",
                facts=[Fact(key="report", value=response_text)],
                citations=[], proposed_actions=[],
                artifacts=[], warnings=[],
                confidence=1.0, retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="reporting-agent",
                status=TaskStatus.failed,
                summary=f"Tạo báo cáo thất bại: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
