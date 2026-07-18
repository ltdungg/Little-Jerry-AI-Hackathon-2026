import os
import time
from datetime import datetime, timezone

from strands import Agent, tool

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, Citation, SourceSystem, TaskStatus,
)
from agents.common.model.provider import get_strands_model


def create_knowledge_agent() -> Agent:
    """Create a Strands Agent for organizational knowledge retrieval."""

    @tool
    def search_organizational_knowledge(query: str) -> str:
        """Tìm kiếm tri thức của tổ chức: chính sách, tài liệu, quyết định, thông tin nội bộ.
        Trả về câu trả lời dựa trên cơ sở tri thức của tổ chức."""
        # Placeholder: trong thực tế sẽ query Bedrock Knowledge Base hoặc S3
        return (
            f"Tìm kiếm tri thức cho: '{query}'.\n"
            f"Kết quả: Hiện tại cơ sở tri thức đang được xây dựng. "
            f"Vui lòng thử lại sau hoặc liên hệ quản trị viên."
        )

    @tool
    def search_documents(query: str) -> str:
        """Tìm kiếm tài liệu trong kho lưu trữ S3 của tổ chức."""
        return (
            f"Tìm kiếm tài liệu: '{query}'.\n"
            f"Kết quả: Chưa có tài liệu phù hợp trong kho lưu trữ."
        )

    model = get_strands_model()
    return Agent(
        name="knowledge",
        model=model,
        tools=[search_organizational_knowledge, search_documents],
        system_prompt=(
            "Bạn là trợ lý tri thức của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, rõ ràng, chính xác.\n"
            "Nếu không tìm thấy thông tin, hãy nói rõ 'Chưa tìm thấy thông tin' thay vì bịa đặt.\n"
            "Khi trả lời, trích dẫn nguồn tài liệu nếu có.\n"
            "Luôn lịch sự và chuyên nghiệp."
        ),
    )


class KnowledgeAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            agent = create_knowledge_agent()
            prompt = (
                f"Yêu cầu từ người dùng: {request.instructions}\n"
                f"Nguồn dữ liệu được phép: {request.constraints.allowed_sources if request.constraints else []}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            # Check for insufficient evidence
            low = response_text.lower()
            insufficient = any(p in low for p in ["insufficient", "chưa đủ", "không đủ", "không tìm thấy", "chưa có"])
            citations = []
            facts = []

            if response_text and not insufficient:
                citation = Citation(
                    source_system=SourceSystem.s3,
                    document_id="doc-seed-001",
                    document_title="Organizational Knowledge",
                    source_uri="s3://curated/tenant-aiv/general/doc-seed-001.txt",
                    excerpt=response_text[:500],
                    last_modified_at=datetime.now(timezone.utc),
                )
                citations.append(citation)
                facts.append(Fact(key="answer", value=response_text))

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="knowledge-agent",
                status=TaskStatus.completed,
                summary=response_text[:200] if response_text else "Không tìm thấy kết quả",
                facts=facts, citations=citations,
                proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.8 if citations else 0.0, retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="knowledge-agent",
                status=TaskStatus.failed,
                summary=f"Truy xuất tri thức thất bại: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
