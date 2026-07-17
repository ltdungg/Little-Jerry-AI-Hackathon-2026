import time
from typing import Any
from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics
from agents.common.contracts.agent import TaskStatus
from agents.common.model.provider import ModelProvider, get_provider
from agents.common.observability.metrics import create_metric_collector

class CommunicationAgent:
    def __init__(self, model_provider: ModelProvider | None = None, slack_client: Any = None):
        self.model_provider = model_provider or get_provider("mock")
        self.slack_client = slack_client
        self.metrics = create_metric_collector()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            # Generate draft
            prompt = f"Draft communication for: {request.instructions}\nContext: {request.inputs}"
            response = await self.model_provider.generate(prompt=prompt, model_id="default")

            # Create proposed action with confirmation token
            confirmation_token = "comm-tok-" + str(time.time())
            proposed_action = {
                "type": "send_slack_message",
                "draft": response.text,
                "confirmation_token": confirmation_token
            }

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.PENDING_CONFIRMATION,
                summary="Communication draft generated.",
                facts=[],
                citations=[],
                proposed_actions=[proposed_action],
                artifacts=[],
                warnings=[],
                confidence=1.0,
                retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=response.input_tokens, output_tokens=response.output_tokens),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.FAILED,
                summary=f"Communication failed: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
