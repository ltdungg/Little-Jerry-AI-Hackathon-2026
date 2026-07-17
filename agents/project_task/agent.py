import time
from typing import Any
from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact
from agents.common.contracts.agent import TaskStatus
from agents.common.model.provider import ModelProvider, get_provider
from agents.common.observability.metrics import create_metric_collector

class ProjectTaskAgent:
    def __init__(self, model_provider: ModelProvider | None = None, gateway_client: Any = None):
        self.model_provider = model_provider or get_provider()
        self.gateway_client = gateway_client
        self.metrics = create_metric_collector()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            if request.intent == "task_query":
                # Logic for reading tasks
                tasks = await self.gateway_client.list_project_tasks()
                summary = f"Retrieved {len(tasks)} tasks."
                facts = [Fact(key="tasks", value=str(tasks))]
                status = TaskStatus.completed
                proposed_actions = []
            elif request.intent == "task_write":
                # Logic for writing tasks (dry_run)
                result = await self.gateway_client.update_task(request.instructions, dry_run=True)
                summary = "Task update proposed."
                facts = [Fact(key="proposal", value=result.id)]
                proposed_actions = [{"type": "confirm_task_update", "token": result.confirmation_token}]
                status = TaskStatus.waiting_for_user
            else:
                raise ValueError("Unsupported intent")

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="project-task-agent",
                status=status,
                summary=summary,
                facts=facts,
                citations=[],
                proposed_actions=proposed_actions,
                artifacts=[],
                warnings=[],
                confidence=1.0,
                retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="project-task-agent",
                status=TaskStatus.failed,
                summary=f"Task operation failed: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
