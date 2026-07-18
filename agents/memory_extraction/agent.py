import json
import os
import time
from datetime import datetime, timezone

import structlog
from strands import Agent, tool

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus,
)
from agents.common.memory import BedrockAgentCoreMemoryStore
from agents.common.model.provider import get_strands_model

logger = structlog.get_logger()

MEMORY_ID = os.getenv("MEMORY_ID", "")


def create_memory_extraction_agent(session_id: str = "default") -> Agent:

    @tool
    def extract_decisions(conversation_text: str) -> str:
        """Phân tích văn bản cuộc trò chuyện và trích xuất các QUYẾT ĐỊNH đã được đưa ra.
        Trả về JSON chứa danh sách quyết định với: nội dung, lý do, người liên quan, ngày tháng.
        Dùng để xây dựng Institutional Memory của tổ chức."""
        return json.dumps({
            "instruction": (
                "Phân tích văn bản sau và trích xuất TẤT CẢ các quyết định. "
                "Với mỗi quyết định, trả về:\n"
                "- content: nội dung quyết định\n"
                "- rationale: lý do / bối cảnh ra quyết định\n"
                "- participants: người tham gia hoặc liên quan\n"
                "- confidence: mức độ chắc chắn (high/medium/low)\n\n"
                f"Văn bản:\n{conversation_text}"
            ),
            "type": "decisions",
            "extract_from": conversation_text[:200],
        }, ensure_ascii=False)

    @tool
    def extract_action_items(conversation_text: str) -> str:
        """Phân tích văn bản cuộc trò chuyện và trích xuất các ACTION ITEMS.
        Trả về JSON chứa danh sách công việc cần làm với: nội dung, người phụ trách, hạn chót, ưu tiên."""
        return json.dumps({
            "instruction": (
                "Phân tích văn bản sau và trích xuất TẤT CẢ action items. "
                "Với mỗi item, trả về:\n"
                "- content: nội dung công việc\n"
                "- assignee: người phụ trách (nếu có)\n"
                "- due_date: hạn chót (nếu có)\n"
                "- priority: mức ưu tiên (high/medium/low)\n"
                "- source: bối cảnh từ đó action item này phát sinh\n\n"
                f"Văn bản:\n{conversation_text}"
            ),
            "type": "action_items",
            "extract_from": conversation_text[:200],
        }, ensure_ascii=False)

    @tool
    def extract_blockers(conversation_text: str) -> str:
        """Phân tích văn bản cuộc trò chuyện và trích xuất các BLOCKERS / VẤN ĐỀ.
        Trả về JSON chứa danh sách blockers với: mô tả, tác động, ai bị ảnh hưởng, giải pháp đề xuất."""
        return json.dumps({
            "instruction": (
                "Phân tích văn bản sau và trích xuất TẤT CẢ blockers và vấn đề. "
                "Với mỗi vấn đề, trả về:\n"
                "- description: mô tả vấn đề\n"
                "- impact: tác động (high/medium/low)\n"
                "- affected: ai hoặc cái gì bị ảnh hưởng\n"
                "- suggested_resolution: giải pháp đề xuất (nếu có)\n\n"
                f"Văn bản:\n{conversation_text}"
            ),
            "type": "blockers",
            "extract_from": conversation_text[:200],
        }, ensure_ascii=False)

    @tool
    def store_memory_entry(entry_type: str, content: str, metadata: str = "{}") -> str:
        """Lưu một memory entry vào Institutional Memory.
        entry_type: decisions / action_items / blockers / general
        content: nội dung đã được extract
        metadata: JSON string chứa context bổ sung"""
        if not MEMORY_ID:
            return json.dumps({
                "status": "skipped",
                "message": "MEMORY_ID chưa được cấu hình, không thể lưu memory.",
            })

        try:
            import asyncio
            store = BedrockAgentCoreMemoryStore(
                memory_id=MEMORY_ID,
                namespace=session_id,
            )

            meta = json.loads(metadata) if metadata else {}
            enriched_content = (
                f"[{entry_type.upper()}] {content}\n"
                f"Metadata: {json.dumps(meta, ensure_ascii=False)}"
            )

            loop = asyncio.new_event_loop()
            loop.run_until_complete(store.add(
                content=enriched_content,
                metadata={"type": entry_type, "session_id": session_id, **meta},
            ))
            loop.close()

            return json.dumps({
                "status": "stored",
                "type": entry_type,
                "message": f"Đã lưu {entry_type} vào Institutional Memory.",
            }, ensure_ascii=False)
        except Exception as e:
            logger.error("memory_store_failed", error=str(e))
            return json.dumps({
                "status": "error",
                "message": f"Lỗi khi lưu memory: {str(e)}",
            }, ensure_ascii=False)

    model = get_strands_model()
    return Agent(
        name="memory_extraction",
        model=model,
        tools=[extract_decisions, extract_action_items, extract_blockers, store_memory_entry],
        system_prompt=(
            "Bạn là chuyên gia trích xuất tri thức tổ chức (Institutional Memory Extractor).\n"
            "NHIỆM VỤ: Phân tích nội dung cuộc trò chuyện và trích xuất các thông tin có giá trị:\n"
            "1. QUYẾT ĐỊNH — những gì đã được thống nhất, phê duyệt, chọn lựa\n"
            "2. ACTION ITEMS — công việc cần làm, ai làm, khi nào xong\n"
            "3. BLOCKERS — vấn đề, rào cản, điểm nghẽn\n\n"
            "QUY TRÌNH:\n"
            "- Bước 1: Dùng extract_decisions để tìm quyết định\n"
            "- Bước 2: Dùng extract_action_items để tìm công việc cần làm\n"
            "- Bước 3: Dùng extract_blockers để tìm vấn đề\n"
            "- Bước 4: Dùng store_memory_entry để lưu từng loại vào memory\n\n"
            "NGUYÊN TẮC:\n"
            "- Chỉ extract thông tin thực sự có giá trị, KHÔNG extract nội dung nhảm\n"
            "- Luôn lưu vào memory sau khi extract\n"
            "- Trả lời bằng tiếng Việt"
        ),
    )


class MemoryExtractionAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        session_id = request.constraints.session_id if request.constraints else "default"

        try:
            agent = create_memory_extraction_agent(session_id=session_id)
            prompt = (
                f"Phân tích nội dung sau và trích xuất quyết định, action items, blockers:\n\n"
                f"{request.instructions}\n\n"
                f"Ngữ cảnh: {json.dumps(request.inputs, ensure_ascii=False) if request.inputs else 'Không có'}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="memory-extraction-agent",
                status=TaskStatus.completed,
                summary="Đã trích xuất và lưu tri thức tổ chức.",
                facts=[Fact(key="extraction_result", value=response_text)],
                citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.85, retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="memory-extraction-agent",
                status=TaskStatus.failed,
                summary=f"Trích xuất tri thức thất bại: {str(e)}",
                facts=[], citations=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
