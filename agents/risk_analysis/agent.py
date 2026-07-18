import json
import os
import time
from datetime import datetime, timezone

import structlog
from strands import Agent, tool

from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus,
)
from agents.common.model.provider import get_strands_model

logger = structlog.get_logger()

DEFAULT_TENANT = "aiv"


def _analyze_overdue_patterns(tasks: list[dict]) -> list[dict]:
    overdue = [t for t in tasks if t.get("is_overdue", False)]
    if not overdue:
        return []

    alerts = []
    assignee_overdue: dict[str, list] = {}
    for t in overdue:
        assignee = t.get("assignee_user_id", "unassigned")
        assignee_overdue.setdefault(assignee, []).append(t)

    for assignee, overdue_tasks in assignee_overdue.items():
        if len(overdue_tasks) >= 3:
            alerts.append({
                "type": "overloaded_member",
                "severity": "high",
                "message": (
                    f"Thành viên {assignee} có {len(overdue_tasks)} task quá hạn. "
                    f"Có thể bị quá tải hoặc cần hỗ trợ."
                ),
                "affected": assignee,
                "task_count": len(overdue_tasks),
                "recommended_action": "Kiểm tra workload và phân phối lại task nếu cần.",
            })
        else:
            for t in overdue_tasks:
                alerts.append({
                    "type": "overdue_task",
                    "severity": "medium",
                    "message": (
                        f"Task \"{t.get('title', 'N/A')}\" đã quá hạn "
                        f"(hạn: {t.get('due_date', 'N/A')})."
                    ),
                    "affected": assignee,
                    "task_id": t.get("task_id"),
                    "recommended_action": "Liên hệ người phụ trách để cập nhật trạng thái.",
                })

    critical_overdue = [t for t in overdue if t.get("priority") == "critical"]
    if critical_overdue:
        alerts.append({
            "type": "critical_overdue",
            "severity": "critical",
            "message": (
                f"Có {len(critical_overdue)} task mức KHẨN CẤP đã quá hạn! "
                f"Cần xử lý ngay."
            ),
            "affected": "multiple",
            "recommended_action": "Điều phối nhân sự xử lý ngay lập tức.",
        })

    return alerts


def _analyze_risk_trends(risks: list[dict]) -> list[dict]:
    alerts = []
    critical_risks = [r for r in risks if r.get("severity") == "critical"]
    high_risks = [r for r in risks if r.get("severity") == "high"]
    open_risks = [r for r in risks if r.get("status") == "open"]

    if critical_risks:
        alerts.append({
            "type": "critical_risk",
            "severity": "critical",
            "message": (
                f"Có {len(critical_risks)} rủi ro mức KHẨN CẤP đang mở. "
                f"Chủ sở hữu cần hành động ngay."
            ),
            "risk_ids": [r.get("risk_id") for r in critical_risks],
            "recommended_action": "Xem xét escalation và phân bổ nguồn lực xử lý.",
        })

    if len(high_risks) >= 3:
        alerts.append({
            "type": "high_risk_cluster",
            "severity": "high",
            "message": (
                f"Có {len(high_risks)} rủi ro mức CAO đồng thời. "
                f"Dự án có thể cần đánh giá lại tổng thể."
            ),
            "recommended_action": "Tổ chức họp đánh giá rủi ro toàn diện.",
        })

    unmitigated = [r for r in open_risks if not r.get("mitigation")]
    if unmitigated:
        alerts.append({
            "type": "unmitigated_risks",
            "severity": "medium",
            "message": (
                f"Có {len(unmitigated)} rủi ro mở CHƯA có giải pháp giảm thiểu."
            ),
            "recommended_action": "Phân bổ chủ sở hữu và xác định giải pháp cho từng rủi ro.",
        })

    today = datetime.now(timezone.utc).date().isoformat()
    overdue_reviews = [
        r for r in open_risks
        if r.get("review_date") and r["review_date"] < today
    ]
    if overdue_reviews:
        alerts.append({
            "type": "overdue_risk_review",
            "severity": "medium",
            "message": (
                f"Có {len(overdue_reviews)} rủi ro đã quá hạn xem xét. "
                f"Cần cập nhật đánh giá."
            ),
            "recommended_action": "Lên lịch xem xét lại các rủi ro quá hạn.",
        })

    return alerts


def _detect_dependency_risks(tasks: list[dict], milestones: list[dict]) -> list[dict]:
    alerts = []

    blocked_tasks = [t for t in tasks if t.get("status") == "blocked"]
    if blocked_tasks:
        alerts.append({
            "type": "blocked_tasks",
            "severity": "high",
            "message": (
                f"Có {len(blocked_tasks)} task bị chặn, "
                f"ảnh hưởng đến tiến độ dự án."
            ),
            "blocked": [
                {
                    "task": t.get("title"),
                    "reason": t.get("blocked_reason", "Không rõ"),
                    "assignee": t.get("assignee_user_id", "N/A"),
                }
                for t in blocked_tasks[:5]
            ],
            "recommended_action": "Phân tích nguyên nhân chặn và tìm cách gỡ bỏ.",
        })

    for m in milestones:
        if m.get("status") in ("completed", "cancelled"):
            continue
        target = m.get("target_date")
        if not target:
            continue
        today = datetime.now(timezone.utc).date().isoformat()
        if target < today:
            alerts.append({
                "type": "milestone_overdue",
                "severity": "critical",
                "message": (
                    f"Milestone \"{m.get('name', 'N/A')}\" đã quá hạn "
                    f"(hạn: {target})."
                ),
                "milestone_id": m.get("milestone_id"),
                "recommended_action": "Đánh giá lại timeline và thông báo stakeholder.",
            })

    done_tasks = sum(1 for t in tasks if t.get("status") in ("done", "completed"))
    total_tasks = len(tasks)
    if total_tasks > 0:
        completion_rate = done_tasks / total_tasks
        if completion_rate < 0.3 and total_tasks >= 5:
            alerts.append({
                "type": "low_completion_rate",
                "severity": "high",
                "message": (
                    f"Tỷ lệ hoàn thành task chỉ {completion_rate*100:.0f}% "
                    f"({done_tasks}/{total_tasks}). Tiến độ có nguy cơ chậm."
                ),
                "recommended_action": "Xem xét lại phân bổ nguồn lực và ưu tiên task.",
            })

    return alerts


def create_risk_analysis_agent(tenant_id: str = DEFAULT_TENANT) -> Agent:
    client = BusinessDataClient(tenant_id=tenant_id)

    @tool
    def analyze_task_overdue_patterns(project_id: str = "") -> str:
        """Phân tích mẫu task quá hạn. Nếu project_id rỗng, phân tích toàn bộ.
        Trả về các cảnh báo về task quá hạn và thành viên bị quá tải."""
        try:
            if project_id:
                tasks = client.list_tasks(project_id)
            else:
                tasks = client.list_all_tasks()

            alerts = _analyze_overdue_patterns(tasks)
            overdue_count = sum(1 for t in tasks if t.get("is_overdue", False))

            result = {
                "summary": {
                    "total_tasks": len(tasks),
                    "overdue_tasks": overdue_count,
                    "alert_count": len(alerts),
                },
                "alerts": alerts,
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)}, ensure_ascii=False)

    @tool
    def analyze_risk_trends(project_id: str = "") -> str:
        """Phân tích xu hướng rủi ro. Nếu project_id rỗng, phân tích toàn bộ.
        Trả về các cảnh báo về rủi ro nghiêm trọng, chưa giảm thiểu, quá hạn xem xét."""
        try:
            if project_id:
                risks = client.list_risks(project_id)
            else:
                risks = client.list_all_risks()

            alerts = _analyze_risk_trends(risks)

            result = {
                "summary": {
                    "total_risks": len(risks),
                    "critical": sum(1 for r in risks if r.get("severity") == "critical"),
                    "high": sum(1 for r in risks if r.get("severity") == "high"),
                    "open": sum(1 for r in risks if r.get("status") == "open"),
                    "alert_count": len(alerts),
                },
                "alerts": alerts,
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)}, ensure_ascii=False)

    @tool
    def detect_dependency_risks(project_id: str) -> str:
        """Phân tích rủi ro phụ thuộc giữa task và milestone trong dự án.
        Trả về các cảnh báo về task bị chặn, milestone quá hạn, tỷ lệ hoàn thành thấp."""
        try:
            tasks = client.list_tasks(project_id)
            milestones = client.list_milestones(project_id)
            alerts = _detect_dependency_risks(tasks, milestones)

            done = sum(1 for t in tasks if t.get("status") in ("done", "completed"))
            result = {
                "summary": {
                    "total_tasks": len(tasks),
                    "completed": done,
                    "blocked": sum(1 for t in tasks if t.get("status") == "blocked"),
                    "milestones": len(milestones),
                    "alert_count": len(alerts),
                },
                "alerts": alerts,
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)}, ensure_ascii=False)

    @tool
    def generate_proactive_alerts(project_id: str = "") -> str:
        """Tổng hợp tất cả cảnh báo từ phân tích task, rủi ro và phụ thuộc.
        Trả về danh sách cảnh báo ưu tiên từ cao xuống thấp."""
        try:
            all_alerts = []

            if project_id:
                tasks = client.list_tasks(project_id)
                risks = client.list_risks(project_id)
                milestones = client.list_milestones(project_id)
            else:
                tasks = client.list_all_tasks()
                risks = client.list_all_risks()
                milestones = []
                for p in client.list_projects():
                    pid = p.get("project_id", "")
                    if pid:
                        milestones.extend(client.list_milestones(pid))

            all_alerts.extend(_analyze_overdue_patterns(tasks))
            all_alerts.extend(_analyze_risk_trends(risks))
            all_alerts.extend(_detect_dependency_risks(tasks, milestones))

            severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            all_alerts.sort(key=lambda a: severity_order.get(a.get("severity", "low"), 4))

            result = {
                "total_alerts": len(all_alerts),
                "critical": sum(1 for a in all_alerts if a.get("severity") == "critical"),
                "high": sum(1 for a in all_alerts if a.get("severity") == "high"),
                "alerts": all_alerts,
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)}, ensure_ascii=False)

    model = get_strands_model()
    return Agent(
        name="risk_analysis",
        model=model,
        tools=[
            analyze_task_overdue_patterns,
            analyze_risk_trends,
            detect_dependency_risks,
            generate_proactive_alerts,
        ],
        system_prompt=(
            "Bạn là chuyên gia phân tích rủi ro của tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt.\n\n"
            "KHẢ NĂNG:\n"
            "- Phân tích task quá hạn (analyze_task_overdue_patterns)\n"
            "- Phân tích xu hướng rủi ro (analyze_risk_trends)\n"
            "- Phát hiện rủi ro phụ thuộc (detect_dependency_risks)\n"
            "- Tổng hợp cảnh báo chủ động (generate_proactive_alerts)\n\n"
            "QUY TẮC:\n"
            "- LUÔN dùng tools để lấy dữ liệu thực tế, KHÔNG bịa đặt\n"
            "- Ưu tiên cảnh báo critical/high trước\n"
            "- Đưa ra đề xuất hành động cụ thể cho mỗi cảnh báo\n"
            "- Trình bày rõ ràng, dễ hiểu cho người không chuyên kỹ thuật"
        ),
    )


class RiskAnalysisAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            agent = create_risk_analysis_agent()
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
                agent_name="risk-analysis-agent",
                status=TaskStatus.completed,
                summary="Đã phân tích rủi ro thành công.",
                facts=[Fact(key="risk_analysis", value=response_text)],
                citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.85, retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="risk-analysis-agent",
                status=TaskStatus.failed,
                summary=f"Phân tích rủi ro thất bại: {str(e)}",
                facts=[], citations=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
