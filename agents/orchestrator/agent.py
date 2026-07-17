import os
import time
import uuid
from typing import Any

import structlog

from agents.common.contracts.agent import (
    AgentTaskRequest,
    AgentTaskResult,
    AgentMetrics,
    TaskStatus,
    TaskIntent,
    Fact,
)
from agents.common.contracts.context import UserRole
from agents.common.auth.authorization import Capability, has_capability
from agents.common.clients.agentcore import RuntimeInvoker
from agents.common.model.provider import get_provider, ModelProvider

logger = structlog.get_logger()

MAX_TASKS_PER_WORKFLOW = 8

# Quyền tối thiểu cần có (theo vai trò người dùng) cho từng loại yêu cầu.
INTENT_CAPABILITY: dict[TaskIntent, Capability] = {
    TaskIntent.knowledge_search: Capability.KNOWLEDGE_READ,
    TaskIntent.task_query: Capability.TASK_READ,
    TaskIntent.task_write: Capability.TASK_WRITE,
    TaskIntent.report_generation: Capability.REPORT_CREATE,
    TaskIntent.communication: Capability.COMM_DRAFT,
}

# Vai trò của một agent chuyên biệt -> intent tương ứng khi được điều phối.
AGENT_SUB_INTENT: dict[str, TaskIntent] = {
    "knowledge": TaskIntent.knowledge_search,
    "project_task": TaskIntent.task_query,
    "reporting": TaskIntent.report_generation,
    "communication": TaskIntent.communication,
}


class OrchestratorAgent:
    def __init__(
        self,
        mode: str = "supervisor",
        model_provider: ModelProvider | None = None,
        invoker: RuntimeInvoker | None = None,
    ):
        self.mode = mode
        self.model = model_provider or get_provider()
        self.model_id = os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-lite-v1:0")
        # RuntimeInvoker để gọi thật các agent runtime con.
        self.invoker = invoker or RuntimeInvoker()
        self._seen_plans: set[str] = set()

    # ---------- Phân loại ý định ----------
    def classify_intent(self, request: AgentTaskRequest) -> TaskIntent:
        msg = request.instructions.lower()
        if any(w in msg for w in ["tìm", "tìm kiếm", "chính sách", "tài liệu", "cuộc họp", "quyết định", "vì sao", "tại sao", "search", "find", "what", "policy", "document", "meeting", "decision", "why"]):
            return TaskIntent.knowledge_search
        if any(w in msg for w in ["tạo task", "phân công", "sửa task", "hạn chót", "giao việc", "create task", "assign", "update task", "deadline"]):
            return TaskIntent.task_write
        if any(w in msg for w in ["task", "công việc", "quá hạn", "cột mốc", "trạng thái", "blocker", "vướng mắc", "overdue", "milestone", "status", "progress"]):
            return TaskIntent.task_query
        if any(w in msg for w in ["báo cáo", "tuần", "tóm tắt", "report", "weekly", "summary"]):
            return TaskIntent.report_generation
        if any(w in msg for w in ["slack", "tin nhắn", "bản nháp", "gửi", "thông báo", "message", "draft", "send", "notify"]):
            return TaskIntent.communication
        return TaskIntent.unknown

    def create_plan(self, request: AgentTaskRequest, intent: TaskIntent) -> list[dict[str, Any]]:
        if intent in (TaskIntent.knowledge_search, TaskIntent.task_query):
            return [{"agent": self._intent_to_agent(intent), "instructions": request.instructions, "inputs": request.inputs}]

        tasks: list[dict[str, Any]] = []
        if intent in (TaskIntent.report_generation, TaskIntent.communication):
            tasks.append({"agent": "knowledge", "instructions": f"Truy xuất ngữ cảnh cho: {request.instructions}", "inputs": request.inputs})
            tasks.append({"agent": "project_task", "instructions": f"Lấy trạng thái dự án cho: {request.instructions}", "inputs": request.inputs})
        if intent == TaskIntent.report_generation:
            tasks.append({"agent": "reporting", "instructions": request.instructions, "inputs": request.inputs})
        if intent == TaskIntent.communication:
            tasks.append({"agent": "communication", "instructions": request.instructions, "inputs": request.inputs})
        if intent == TaskIntent.task_write:
            tasks.append({"agent": "project_task", "instructions": request.instructions, "inputs": {**request.inputs, "dry_run": True}})
        return tasks[:MAX_TASKS_PER_WORKFLOW]

    def _intent_to_agent(self, intent: TaskIntent) -> str:
        mapping = {
            TaskIntent.knowledge_search: "knowledge",
            TaskIntent.task_query: "project_task",
            TaskIntent.task_write: "project_task",
            TaskIntent.report_generation: "reporting",
            TaskIntent.communication: "communication",
        }
        return mapping.get(intent, "knowledge")

    def _resolve_role(self, request: AgentTaskRequest) -> UserRole:
        raw = request.constraints.user_role if request.constraints else "volunteer"
        try:
            return UserRole(raw)
        except ValueError:
            return UserRole.volunteer

    def _build_sub_request(self, request: AgentTaskRequest, task: dict[str, Any], orch_intent: TaskIntent) -> AgentTaskRequest:
        agent_name = task["agent"]
        sub_intent = AGENT_SUB_INTENT.get(agent_name, TaskIntent.unknown)
        # Với task_write, project_task nhận đúng intent task_write.
        if agent_name == "project_task" and orch_intent == TaskIntent.task_write:
            sub_intent = TaskIntent.task_write
        return AgentTaskRequest(
            workflow_id=request.workflow_id,
            task_id=str(uuid.uuid4()),
            parent_task_id=request.task_id,
            agent_name=agent_name,
            intent=sub_intent,
            instructions=task["instructions"],
            inputs=task.get("inputs", {}),
            constraints=request.constraints,
        )

    def _fail(self, request: AgentTaskRequest, start: float, summary: str, warnings: list[str], retryable: bool = False) -> AgentTaskResult:
        return AgentTaskResult(
            workflow_id=request.workflow_id, task_id=request.task_id, agent_name="orchestrator",
            status=TaskStatus.failed, summary=summary, facts=[], citations=[], proposed_actions=[],
            artifacts=[], warnings=warnings, confidence=0.0, retryable=retryable,
            metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
        )

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            role = self._resolve_role(request)
            intent = self.classify_intent(request)
            logger.info("intent_classified", intent=intent.value, role=role.value, workflow_id=request.workflow_id)

            # ---------- Kiểm tra quyền theo vai trò ----------
            required = INTENT_CAPABILITY.get(intent)
            if required and not has_capability(role, required):
                return self._fail(
                    request, start,
                    summary=f"Vai trò '{role.value}' không có quyền thực hiện yêu cầu này (cần '{required.value}').",
                    warnings=["forbidden"],
                )

            plan = self.create_plan(request, intent)
            plan_key = str(sorted([(t["agent"], t["instructions"]) for t in plan]))
            if plan_key in self._seen_plans:
                return self._fail(request, start, "Phát hiện kế hoạch lặp lại. Có thể có vòng lặp agent.", ["Phát hiện kế hoạch lặp lại"])
            self._seen_plans.add(plan_key)

            if not plan:
                return AgentTaskResult(
                    workflow_id=request.workflow_id, task_id=request.task_id, agent_name="orchestrator",
                    status=TaskStatus.completed, summary="Yêu cầu này không cần tác vụ chuyên biệt nào.",
                    facts=[], citations=[], proposed_actions=[], artifacts=[], warnings=[],
                    confidence=0.5, retryable=False,
                    metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
                )

            # ---------- Điều phối tới các agent runtime con (thật) ----------
            all_facts: list[Fact] = []
            all_citations: list = []
            all_proposed: list = []
            all_warnings: list[str] = []
            total_in = total_out = 0
            single_summary: str | None = None

            for task in plan:
                agent_name = task["agent"]
                sub_req = self._build_sub_request(request, task, intent)
                result = await self.invoker.invoke(agent_name, sub_req)

                if result is not None:
                    all_facts.extend(result.facts)
                    all_citations.extend(result.citations)
                    all_proposed.extend(result.proposed_actions)
                    all_warnings.extend(result.warnings)
                    total_in += result.metrics.input_tokens
                    total_out += result.metrics.output_tokens
                    single_summary = result.summary
                else:
                    # Fallback: agent runtime chưa sẵn sàng -> gọi model trực tiếp.
                    all_warnings.append(f"Không gọi được runtime '{agent_name}', dùng model trực tiếp.")
                    response = await self.model.generate(
                        prompt=f"[{agent_name}] {task['instructions']}",
                        model_id=self.model_id, temperature=0.3, max_tokens=2048,
                    )
                    if response.text:
                        all_facts.append(Fact(key=agent_name, value=response.text[:500]))
                        single_summary = response.text[:200]
                    total_in += response.input_tokens
                    total_out += response.output_tokens

            if len(plan) == 1 and single_summary:
                summary = single_summary
            else:
                summary = f"Đã điều phối {len(plan)} tác vụ chuyên biệt tới các agent."

            return AgentTaskResult(
                workflow_id=request.workflow_id, task_id=request.task_id, agent_name="orchestrator",
                status=TaskStatus.completed, summary=summary, facts=all_facts, citations=all_citations,
                proposed_actions=all_proposed, artifacts=[], warnings=all_warnings,
                confidence=0.8, retryable=False,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=total_in, output_tokens=total_out),
            )

        except Exception as e:
            logger.error("orchestrator_error", error=str(e))
            return self._fail(request, start, f"Lỗi điều phối: {str(e)}", [str(e)], retryable=True)
