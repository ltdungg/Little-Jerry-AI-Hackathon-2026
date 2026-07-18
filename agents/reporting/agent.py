import json
import os
import time
import uuid

import structlog
from strands import Agent, tool

from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus,
)
from agents.common.model.provider import get_strands_model
from shared.report_generators import REPORT_GENERATORS

logger = structlog.get_logger()

ARTIFACT_BUCKET = os.getenv("ARTIFACT_BUCKET", "")
DEFAULT_TENANT = "aiv"


def create_reporting_agent(tenant_id: str = DEFAULT_TENANT) -> Agent:
    client = BusinessDataClient(tenant_id=tenant_id)

    @tool
    def generate_report(project_id: str, report_type: str = "weekly_status") -> str:
        """Tạo báo cáo cho dự án. Các loại: daily_status, weekly_status, risk_summary, progress_summary.
        Trả về nội dung báo cáo Markdown đầy đủ dựa trên dữ liệu thực tế."""
        generator = REPORT_GENERATORS.get(report_type)
        if not generator:
            return (
                f"Loại báo cáo '{report_type}' chưa được hỗ trợ. "
                f"Các loại có sẵn: {', '.join(sorted(REPORT_GENERATORS))}"
            )
        try:
            content = generator(project_id, client)
            return content
        except Exception as e:
            logger.error("report_generation_failed", project_id=project_id, error=str(e))
            return f"Lỗi khi tạo báo cáo: {str(e)}"

    @tool
    def store_report(content: str, title: str = "Báo cáo tự động", project_id: str = "") -> str:
        """Lưu báo cáo đã tạo vào kho lưu trữ S3. Trả về URI của báo cáo đã lưu."""
        if not ARTIFACT_BUCKET:
            return "Lỗi: ARTIFACT_BUCKET chưa được cấu hình. Báo cáo không thể lưu."

        workflow_id = f"rpt-{uuid.uuid4().hex[:12]}"
        artifact_id = f"art-{uuid.uuid4().hex[:12]}"

        try:
            from agents.common.clients.s3_client import store_report_artifact
            store_report_artifact(
                bucket=ARTIFACT_BUCKET,
                tenant_id=tenant_id,
                workflow_id=workflow_id,
                artifact_id=artifact_id,
                content=content,
            )
            s3_uri = f"s3://{ARTIFACT_BUCKET}/{tenant_id}/{workflow_id}/artifacts/{artifact_id}.json"
            logger.info("report_stored", s3_uri=s3_uri, title=title)
            return f"Báo cáo '{title}' đã được lưu.\nURI: {s3_uri}"
        except Exception as e:
            logger.error("report_store_failed", error=str(e))
            return f"Lỗi khi lưu báo cáo: {str(e)}"

    @tool
    def list_reports(project_id: str) -> str:
        """Liệt kê các báo cáo đã tạo cho dự án."""
        try:
            reports = client.list_reports(project_id) if hasattr(client, 'list_reports') else []
            if not reports:
                return "Chưa có báo cáo nào cho dự án này."
            lines = [f"**{len(reports)} báo cáo:**"]
            for r in reports[:10]:
                lines.append(
                    f"- {r.get('title', 'N/A')} "
                    f"({r.get('report_type', 'N/A')}) — "
                    f"{r.get('created_at', 'N/A')}"
                )
            return "\n".join(lines)
        except Exception as e:
            return f"Lỗi khi liệt kê báo cáo: {str(e)}"

    model = get_strands_model()
    return Agent(
        name="reporting",
        model=model,
        tools=[generate_report, store_report, list_reports],
        system_prompt=(
            "Bạn là trợ lý tạo báo cáo của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.\n\n"
            "KHẢ NĂNG:\n"
            "- Tạo báo cáo ngày (daily_status): những gì thay đổi trong 24h qua\n"
            "- Tạo báo cáo tuần (weekly_status): tổng quan task, rủi ro, milestone\n"
            "- Tạo báo cáo rủi ro (risk_summary): phân tích chi tiết các rủi ro\n"
            "- Tạo báo cáo tiến độ (progress_summary): theo dõi tiến độ thực hiện\n"
            "- Lưu báo cáo vào kho lưu trữ\n\n"
            "QUY TẮC:\n"
            "- Luôn dùng generate_report để lấy dữ liệu thực tế trước khi trình bày\n"
            "- Sau khi tạo báo cáo, gợi ý lưu bằng store_report\n"
            "- Dựa trên dữ liệu thực tế, KHÔNG bịa đặt số liệu\n"
            "- Chuyên nghiệp, phù hợp với tổ chức phi lợi nhuận."
        ),
    )


class ReportingAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self, tenant_id: str = DEFAULT_TENANT):
        self._tenant_id = tenant_id

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            agent = create_reporting_agent(tenant_id=self._tenant_id)
            prompt = (
                f"Yêu cầu từ người dùng: {request.instructions}\n"
                f"Ngữ cảnh: {json.dumps(request.inputs, ensure_ascii=False) if request.inputs else 'Không có'}"
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
                facts=[], citations=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
