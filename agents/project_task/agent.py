import time
import uuid
from typing import Any

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus, TaskIntent
from agents.common.clients.dynamodb_client import BusinessDataClient


class ProjectTaskAgent:
    def __init__(self, data_client: BusinessDataClient | None = None):
        self.data_client = data_client

    def _client(self, tenant_id: str) -> BusinessDataClient:
        return self.data_client or BusinessDataClient(tenant_id=tenant_id)

    def _project_id(self, request: AgentTaskRequest) -> str | None:
        ids = request.constraints.project_ids if request.constraints else []
        return ids[0] if ids else None

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        tenant_id = request.constraints.tenant_id if request.constraints else "aiv"
        client = self._client(tenant_id)
        project_id = self._project_id(request)

        try:
            if request.intent == TaskIntent.task_query:
                if project_id:
                    tasks = client.list_tasks(project_id)
                else:
                    tasks = client.list_overdue_tasks()
                overdue = [t for t in tasks if t.get("status") not in ("done", "cancelled", "completed")]
                summary = f"Đã lấy {len(tasks)} tác vụ" + (f" cho dự án {project_id}." if project_id else ".")
                if overdue:
                    summary += f" Trong đó có {len(overdue)} tác vụ chưa hoàn thành/có thể quá hạn."
                facts = [Fact(key=f"task_{t.get('task_id', i)}", value=str(t)) for i, t in enumerate(tasks[:20])]
                return self._ok(request, start, TaskStatus.completed, summary, facts)

            elif request.intent == TaskIntent.task_write:
                if not project_id:
                    return self._fail(request, start, "Cần chỉ định project_id để tạo/cập nhật tác vụ.")
                task_id = request.inputs.get("task_id") or str(uuid.uuid4())
                dry_run = bool(request.inputs.get("dry_run", True))
                preview = {
                    "task_id": task_id,
                    "title": request.inputs.get("title", request.instructions),
                    "status": request.inputs.get("status", "todo"),
                    "due_date": request.inputs.get("due_date"),
                    "assignee_user_id": request.inputs.get("assignee_user_id"),
                }
                if dry_run:
                    token = f"tok-{uuid.uuid4().hex[:12]}"
                    return AgentTaskResult(
                        workflow_id=request.workflow_id, task_id=request.task_id, agent_name="project-task-agent",
                        status=TaskStatus.waiting_for_user,
                        summary="Đã đề xuất thay đổi tác vụ, cần xác nhận trước khi áp dụng.",
                        facts=[Fact(key="proposal", value=str(preview))], citations=[],
                        proposed_actions=[{"action_id": token, "action_type": "confirm_task_update", "parameters": preview, "preview": preview, "confirmation_token": token}],
                        artifacts=[], warnings=[], confidence=1.0, retryable=False,
                        metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
                    )
                client.put_task(project_id, preview)
                return self._ok(request, start, TaskStatus.completed, "Đã cập nhật tác vụ.", [Fact(key="task", value=str(preview))])

            else:
                return self._fail(request, start, f"Ý định không được hỗ trợ: {request.intent}")

        except Exception as e:
            return self._fail(request, start, f"Thao tác tác vụ thất bại: {str(e)}", retryable=True)

    def _ok(self, request, start, status, summary, facts) -> AgentTaskResult:
        return AgentTaskResult(
            workflow_id=request.workflow_id, task_id=request.task_id, agent_name="project-task-agent",
            status=status, summary=summary, facts=facts, citations=[], proposed_actions=[], artifacts=[],
            warnings=[], confidence=1.0, retryable=False,
            metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
        )

    def _fail(self, request, start, summary, retryable: bool = False) -> AgentTaskResult:
        return AgentTaskResult(
            workflow_id=request.workflow_id, task_id=request.task_id, agent_name="project-task-agent",
            status=TaskStatus.failed, summary=summary, facts=[], citations=[], proposed_actions=[],
            artifacts=[], warnings=[summary], confidence=0.0, retryable=retryable,
            metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
        )
