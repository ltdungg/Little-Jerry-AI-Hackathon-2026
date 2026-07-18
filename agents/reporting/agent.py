import json
import os
import time
import uuid
from datetime import datetime, timezone

import structlog
from strands import Agent, tool

from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus,
)
from agents.common.model.provider import get_strands_model

logger = structlog.get_logger()

ARTIFACT_BUCKET = os.getenv("ARTIFACT_BUCKET", "")
DEFAULT_TENANT = "aiv"


def _format_task_summary(tasks: list[dict]) -> str:
    if not tasks:
        return "Không có task nào."
    total = len(tasks)
    done = sum(1 for t in tasks if t.get("status") in ("done", "completed"))
    overdue = sum(1 for t in tasks if t.get("is_overdue", False))
    in_progress = sum(1 for t in tasks if t.get("status") == "in_progress")
    blocked = sum(1 for t in tasks if t.get("status") == "blocked")
    todo = sum(1 for t in tasks if t.get("status") == "todo")

    lines = [
        f"**Tổng quan task:** {total} task",
        f"- Hoàn thành: {done}/{total} ({done*100//total if total else 0}%)",
        f"- Đang thực hiện: {in_progress}",
        f"- Chờ làm: {todo}",
        f"- Bị chặn: {blocked}",
    ]
    if overdue > 0:
        lines.append(f"- **QUÁ HẠN: {overdue}**")
    return "\n".join(lines)


def _format_risk_summary(risks: list[dict]) -> str:
    if not risks:
        return "Không có rủi ro nào được ghi nhận."
    critical = sum(1 for r in risks if r.get("severity") == "critical")
    high = sum(1 for r in risks if r.get("severity") == "high")
    medium = sum(1 for r in risks if r.get("severity") == "medium")
    low = sum(1 for r in risks if r.get("severity") == "low")
    open_count = sum(1 for r in risks if r.get("status") == "open")

    lines = [
        f"**Tổng quan rủi ro:** {len(risks)} rủi ro ({open_count} đang mở)",
    ]
    if critical:
        lines.append(f"- **Khẩn cấp: {critical}**")
    if high:
        lines.append(f"- Cao: {high}")
    if medium:
        lines.append(f"- Trung bình: {medium}")
    if low:
        lines.append(f"- Thấp: {low}")

    top_risks = sorted(risks, key=lambda r: r.get("score", 0), reverse=True)[:3]
    if top_risks:
        lines.append("\n**3 rủi ro lớn nhất:**")
        for r in top_risks:
            lines.append(
                f"- \"{r.get('title', 'N/A')}\" "
                f"(điểm: {r.get('score', 0)}, "
                f"mức: {r.get('severity', 'N/A')})"
            )
    return "\n".join(lines)


def _format_milestone_summary(milestones: list[dict]) -> str:
    if not milestones:
        return "Không có milestone nào."
    upcoming = [m for m in milestones if m.get("status") not in ("completed", "cancelled")]
    completed = [m for m in milestones if m.get("status") == "completed"]

    lines = [f"**Milestone:** {len(completed)}/{len(milestones)} đã hoàn thành"]
    for m in upcoming[:3]:
        lines.append(
            f"- \"{m.get('name', 'N/A')}\" "
            f"(trạng thái: {m.get('status', 'N/A')}, "
            f"hạn: {m.get('target_date', 'N/A')})"
        )
    return "\n".join(lines)


def _generate_weekly_status(project_id: str, client: BusinessDataClient) -> str:
    project = client.get_project(project_id)
    tasks = client.list_tasks(project_id)
    risks = client.list_risks(project_id)
    milestones = client.list_milestones(project_id)

    now = datetime.now(timezone.utc)
    lines = [
        f"# Báo cáo tuần — {project.get('name', project_id)}",
        f"**Ngày tạo:** {now.strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Trạng thái dự án:** {project.get('status', 'N/A')}",
        f"**Sức khỏe:** {project.get('health', 'N/A')}",
        "",
        "## Tiến độ",
        _format_task_summary(tasks),
        "",
        "## Rủi ro",
        _format_risk_summary(risks),
        "",
        "## Milestone",
        _format_milestone_summary(milestones),
    ]
    return "\n".join(lines)


def _generate_risk_summary(project_id: str, client: BusinessDataClient) -> str:
    risks = client.list_risks(project_id)
    tasks = client.list_tasks(project_id)
    project = client.get_project(project_id)

    now = datetime.now(timezone.utc)
    lines = [
        f"# Báo cáo rủi ro — {project.get('name', project_id)}",
        f"**Ngày tạo:** {now.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Tổng quan",
        _format_risk_summary(risks),
        "",
        "## Rủi ro chi tiết",
    ]

    for r in sorted(risks, key=lambda x: x.get("score", 0), reverse=True):
        lines.append(
            f"\n### {r.get('title', 'N/A')}\n"
            f"- **Mức độ:** {r.get('severity', 'N/A')} (điểm: {r.get('score', 0)})\n"
            f"- **Khả năng xảy ra:** {r.get('likelihood', 'N/A')}/5\n"
            f"- **Tác động:** {r.get('impact', 'N/A')}/5\n"
            f"- **Trạng thái:** {r.get('status', 'N/A')}\n"
            f"- **Chủ sở hữu:** {r.get('owner_user_id', 'N/A')}\n"
            f"- **Giải pháp:** {r.get('mitigation', 'Chưa có')}\n"
            f"- **Ngày xem xét:** {r.get('review_date', 'N/A')}"
        )

    blocked_tasks = [t for t in tasks if t.get("status") == "blocked"]
    if blocked_tasks:
        lines.append("\n## Task bị chặn (liên quan rủi ro)")
        for t in blocked_tasks:
            lines.append(
                f"- \"{t.get('title', 'N/A')}\" — {t.get('blocked_reason', 'Lý do chưa rõ')}"
            )

    return "\n".join(lines)


def _generate_progress_summary(project_id: str, client: BusinessDataClient) -> str:
    tasks = client.list_tasks(project_id)
    milestones = client.list_milestones(project_id)
    project = client.get_project(project_id)

    now = datetime.now(timezone.utc)
    lines = [
        f"# Báo cáo tiến độ — {project.get('name', project_id)}",
        f"**Ngày tạo:** {now.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Task",
        _format_task_summary(tasks),
        "",
        "## Milestone",
        _format_milestone_summary(milestones),
    ]

    overdue_tasks = [t for t in tasks if t.get("is_overdue", False)]
    if overdue_tasks:
        lines.append("\n## Task quá hạn")
        for t in overdue_tasks:
            lines.append(
                f"- \"{t.get('title', 'N/A')}\" — hạn: {t.get('due_date', 'N/A')}"
            )

    return "\n".join(lines)


REPORT_GENERATORS = {
    "weekly_status": _generate_weekly_status,
    "risk_summary": _generate_risk_summary,
    "progress_summary": _generate_progress_summary,
}


def create_reporting_agent(tenant_id: str = DEFAULT_TENANT) -> Agent:
    client = BusinessDataClient(tenant_id=tenant_id)

    @tool
    def generate_report(project_id: str, report_type: str = "weekly_status") -> str:
        """Tạo báo cáo cho dự án. Các loại: weekly_status, risk_summary, progress_summary.
        Trả về nội dung báo cáo Markdown đầy đủ dựa trên dữ liệu thực tế."""
        generator = REPORT_GENERATORS.get(report_type)
        if not generator:
            return (
                f"Loại báo cáo '{report_type}' chưa được hỗ trợ. "
                f"Các loại có sẵn: weekly_status, risk_summary, progress_summary"
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
