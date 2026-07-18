import json
import os
import time
from datetime import datetime, timezone

import boto3
import structlog
from strands import Agent, tool

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, Citation, SourceSystem, TaskStatus,
)
from agents.common.model.provider import get_strands_model

logger = structlog.get_logger()

KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID", "")
BEDROCK_REGION = os.getenv("AWS_REGION", "ap-southeast-2")


def _get_bedrock_agent_runtime():
    return boto3.client("bedrock-agent-runtime", region_name=BEDROCK_REGION)


def _get_bedrock_runtime():
    return boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


def create_knowledge_agent() -> Agent:

    @tool
    def search_organizational_knowledge(query: str) -> str:
        """Tìm kiếm tri thức tổ chức: chính sách, quy trình, quyết định, thông tin nội bộ.
        Sử dụng cơ sở tri thức (Knowledge Base) của tổ chức để trả lời câu hỏi.
        Trả về câu trả lời đầy đủ dựa trên tài liệu thực tế."""
        if not KNOWLEDGE_BASE_ID:
            return (
                "Không thể truy cập cơ sở tri thức: KNOWLEDGE_BASE_ID chưa được cấu hình. "
                "Vui lòng liên hệ quản trị viên."
            )

        try:
            runtime = _get_bedrock_agent_runtime()
            response = runtime.retrieve_and_generate(
                input={"text": query},
                retrieveAndGenerateConfiguration={
                    "type": "KNOWLEDGE_BASE",
                    "knowledgeBaseConfiguration": {
                        "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                    },
                },
            )

            answer = response.get("output", {}).get("text", "")
            citations = response.get("citations", [])

            if not answer:
                return "Không tìm thấy thông tin phù hợp trong cơ sở tri thức tổ chức."

            result_parts = [answer]
            if citations:
                result_parts.append("\n---\nNguồn tham khảo:")
                for i, citation in enumerate(citations[:5], 1):
                    ref = citation.get("retrievedReferences", [])
                    for r in ref:
                        location = r.get("location", {})
                        s3_loc = location.get("s3Location", {})
                        doc_uri = s3_loc.get("uri", "")
                        excerpt = r.get("content", {}).get("text", "")[:200]
                        result_parts.append(
                            f"{i}. [{doc_uri}] — \"{excerpt}...\""
                        )

            return "\n".join(result_parts)

        except Exception as e:
            logger.error("kb_retrieve_and_generate_failed", error=str(e))
            return f"Lỗi khi truy vấn cơ sở tri thức: {str(e)}"

    @tool
    def search_documents(query: str, top_k: int = 5) -> str:
        """Tìm kiếm tài liệu trong kho lưu trữ của tổ chức.
        Trả về các đoạn trích (chunks) liên quan nhất từ tài liệu.
        Dùng khi cần tìm kiếm chính xác trong nội dung tài liệu thay vì trả lời tổng quát."""
        if not KNOWLEDGE_BASE_ID:
            return "Không thể tìm kiếm tài liệu: KNOWLEDGE_BASE_ID chưa được cấu hình."

        try:
            runtime = _get_bedrock_agent_runtime()
            response = runtime.retrieve(
                knowledgeBaseId=KNOWLEDGE_BASE_ID,
                retrievalQuery={"text": query},
                retrievalConfiguration={
                    "vectorSearchConfiguration": {
                        "numberOfResults": min(top_k, 10),
                    }
                },
            )

            results = response.get("retrievalResults", [])
            if not results:
                return "Không tìm thấy tài liệu phù hợp."

            parts = [f"Tìm thấy {len(results)} tài liệu liên quan:\n"]
            for i, result in enumerate(results, 1):
                content = result.get("content", {}).get("text", "")
                location = result.get("location", {})
                s3_loc = location.get("s3Location", {})
                doc_uri = s3_loc.get("uri", "unknown")
                score = result.get("score", 0)

                parts.append(
                    f"**Tài liệu {i}** (độ liên quan: {score:.2f})\n"
                    f"Nguồn: {doc_uri}\n"
                    f"Nội dung: {content[:500]}\n"
                )

            return "\n".join(parts)

        except Exception as e:
            logger.error("kb_retrieve_failed", error=str(e))
            return f"Lỗi khi tìm kiếm tài liệu: {str(e)}"

    model = get_strands_model()
    return Agent(
        name="knowledge",
        model=model,
        tools=[search_organizational_knowledge, search_documents],
        system_prompt=(
            "Bạn là trợ lý tri thức của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, rõ ràng, chính xác.\n\n"
            "KHẢ NĂNG:\n"
            "- Tìm kiếm tri thức tổ chức qua search_organizational_knowledge\n"
            "- Tìm kiếm chi tiết tài liệu qua search_documents\n\n"
            "ĐỊNH DẠNG TRẢ LỜI:\n"
            "- Trả lời trực tiếp vào câu hỏi, không lan man.\n"
            "- Nếu có nhiều điểm, dùng bullet points.\n"
            "- Luôn trích dẫn nguồn tài liệu (VD: 'Theo tài liệu...').\n"
            "- Nếu không tìm thấy thông tin, nói rõ 'Chưa tìm thấy thông tin' "
            "và gợi ý cách tìm kiếm khác.\n\n"
            "QUY TẮC:\n"
            "- KHÔNG bịa đặt thông tin. Nếu không chắc chắn, nói rõ.\n"
            "- Luôn lịch sự và chuyên nghiệp.\n"
            "- Kết thúc bằng câu hỏi hỗ trợ thêm nếu phù hợp."
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

            low = response_text.lower()
            insufficient = any(p in low for p in [
                "insufficient", "chưa đủ", "không đủ", "không tìm thấy",
                "chưa có", "lỗi khi", "chưa được cấu hình",
            ])
            citations = []
            facts = []

            if response_text and not insufficient:
                citation = Citation(
                    source_system=SourceSystem.s3,
                    document_id="kb-retrieval",
                    document_title="Organizational Knowledge Base",
                    source_uri=f"bedrock://kb/{KNOWLEDGE_BASE_ID}",
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
                facts=[], citations=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
