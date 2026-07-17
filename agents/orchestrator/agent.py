import time
import uuid
from datetime import datetime, timezone
from typing import Any

from agents.common.contracts.agent import (
    AgentTaskRequest,
    AgentTaskResult,
    AgentMetrics,
    TaskStatus,
    TaskIntent,
)
import os

from agents.common.model.provider import get_provider, ModelProvider
from agents.common.observability.metrics import MetricCollector
import structlog

logger = structlog.get_logger()

MAX_PLAN_DEPTH = 2
MAX_TASKS_PER_WORKFLOW = 8
MAX_CONCURRENT = 3


class OrchestratorAgent:
    def __init__(self, mode: str = "supervisor", model_provider: ModelProvider | None = None):
        self.mode = mode
        self.model = model_provider or get_provider()
        self.model_id = os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-lite-v1:0")
        self.metrics = MetricCollector()
        self._seen_plans: set[str] = set()

    def classify_intent(self, request: AgentTaskRequest) -> TaskIntent:
        msg = request.instructions.lower()
        if any(w in msg for w in ["tìm", "tìm kiếm", "chính sách", "tài liệu", "cuộc họp", "search", "find", "what", "policy", "document", "meeting"]):
            return TaskIntent.knowledge_search
        if any(w in msg for w in ["tạo task", "phân công", "sửa task", "hạn chót", "create task", "assign", "update task", "deadline"]):
            return TaskIntent.task_write
        if any(w in msg for w in ["task", "quá hạn", "cột mốc", "trạng thái", "overdue", "milestone", "status"]):
            return TaskIntent.task_query
        if any(w in msg for w in ["báo cáo", "tuần", "tóm tắt", "report", "weekly", "summary"]):
            return TaskIntent.report_generation
        if any(w in msg for w in ["slack", "tin nhắn", "bản nháp", "gửi", "message", "draft", "send"]):
            return TaskIntent.communication
        return TaskIntent.unknown

    def create_plan(self, request: AgentTaskRequest, intent: TaskIntent) -> list[dict[str, Any]]:
        if intent in (TaskIntent.knowledge_search, TaskIntent.task_query):
            return [
                {
                    "agent": self._intent_to_agent(intent),
                    "instructions": request.instructions,
                    "inputs": request.inputs,
                    "depth": 1,
                }
            ]

        # Complex requests: supervisor mode
        tasks = []
        if intent in (TaskIntent.report_generation, TaskIntent.communication):
            tasks.append(
                {
                    "agent": "knowledge",
                    "instructions": f"Retrieve context for: {request.instructions}",
                    "inputs": request.inputs,
                    "depth": 1,
                }
            )
            tasks.append(
                {
                    "agent": "project_task",
                    "instructions": f"Get project status for: {request.instructions}",
                    "inputs": request.inputs,
                    "depth": 1,
                }
            )
        if intent == TaskIntent.report_generation:
            tasks.append(
                {
                    "agent": "reporting",
                    "instructions": request.instructions,
                    "inputs": request.inputs,
                    "depth": 1,
                    "depends_on": ["knowledge", "project_task"],
                }
            )
        if intent == TaskIntent.communication:
            tasks.append(
                {
                    "agent": "communication",
                    "instructions": request.instructions,
                    "inputs": request.inputs,
                    "depth": 1,
                }
            )
        if intent == TaskIntent.task_write:
            tasks.append(
                {
                    "agent": "project_task",
                    "instructions": request.instructions,
                    "inputs": {**request.inputs, "dry_run": True},
                    "depth": 1,
                }
            )
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

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            intent = self.classify_intent(request)
            logger.info("intent_classified", intent=intent.value, workflow_id=request.workflow_id)

            plan = self.create_plan(request, intent)
            plan_key = str(sorted([(t["agent"], t["instructions"]) for t in plan]))

            # Detect repeated plans
            if plan_key in self._seen_plans:
                logger.warning("repeated_plan_detected", plan_key=plan_key)
                return AgentTaskResult(
                    workflow_id=request.workflow_id,
                    task_id=request.task_id,
                    agent_name="orchestrator",
                    status=TaskStatus.failed,
                    summary="Repeated plan detected. Possible agent loop.",
                    facts=[],
                    citations=[],
                    proposed_actions=[],
                    artifacts=[],
                    warnings=["Repeated plan detected"],
                    confidence=0.0,
                    retryable=False,
                    metrics=AgentMetrics(
                        latency_ms=int((time.time() - start) * 1000),
                        input_tokens=0,
                        output_tokens=0,
                    ),
                )
            self._seen_plans.add(plan_key)

            if not plan:
                return AgentTaskResult(
                    workflow_id=request.workflow_id,
                    task_id=request.task_id,
                    agent_name="orchestrator",
                    status=TaskStatus.completed,
                    summary="No specialist tasks needed for this request.",
                    facts=[],
                    citations=[],
                    proposed_actions=[],
                    artifacts=[],
                    warnings=[],
                    confidence=0.5,
                    retryable=False,
                    metrics=AgentMetrics(
                        latency_ms=int((time.time() - start) * 1000),
                        input_tokens=0,
                        output_tokens=0,
                    ),
                )

            # For router mode (single task), return a simulated result
            if len(plan) == 1:
                task = plan[0]
                agent_name = task["agent"]
                response = await self.model.generate(
                    prompt=f"[{agent_name}] {task['instructions']}",
                    model_id=self.model_id,
                    temperature=0.3,
                    max_tokens=2048,
                )
                latency = int((time.time() - start) * 1000)
                return AgentTaskResult(
                    workflow_id=request.workflow_id,
                    task_id=request.task_id,
                    agent_name="orchestrator",
                    status=TaskStatus.completed,
                    summary=response.text[:200] if response.text else "Completed",
                    facts=[],
                    citations=[],
                    proposed_actions=[],
                    artifacts=[],
                    warnings=[],
                    confidence=0.8,
                    retryable=False,
                    metrics=AgentMetrics(
                        latency_ms=latency,
                        input_tokens=response.input_tokens,
                        output_tokens=response.output_tokens,
                    ),
                )

            # Supervisor mode: simulate multi-agent execution
            all_facts = []
            all_citations = []
            all_warnings = []
            total_input = 0
            total_output = 0

            for task in plan:
                agent_name = task["agent"]
                response = await self.model.generate(
                    prompt=f"[{agent_name}] {task['instructions']}",
                    model_id=self.model_id,
                    temperature=0.3,
                    max_tokens=2048,
                )
                if response.text:
                    from agents.common.contracts.agent import Fact
                    all_facts.append(Fact(key=agent_name, value=response.text[:500]))
                total_input += response.input_tokens
                total_output += response.output_tokens

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="orchestrator",
                status=TaskStatus.completed,
                summary=f"Supervisor plan completed with {len(plan)} specialist tasks.",
                facts=all_facts,
                citations=all_citations,
                proposed_actions=[],
                artifacts=[],
                warnings=all_warnings,
                confidence=0.8,
                retryable=False,
                metrics=AgentMetrics(
                    latency_ms=latency,
                    input_tokens=total_input,
                    output_tokens=total_output,
                ),
            )

        except Exception as e:
            latency = int((time.time() - start) * 1000)
            logger.error("orchestrator_error", error=str(e))
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="orchestrator",
                status=TaskStatus.failed,
                summary=f"Orchestrator error: {str(e)}",
                facts=[],
                citations=[],
                proposed_actions=[],
                artifacts=[],
                warnings=[str(e)],
                confidence=0.0,
                retryable=True,
                metrics=AgentMetrics(
                    latency_ms=latency,
                    input_tokens=0,
                    output_tokens=0,
                ),
            )
