import time
from typing import Any
from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics
from agents.common.contracts.agent import TaskStatus
from agents.common.model.provider import ModelProvider, get_provider
from agents.common.observability.metrics import create_metric_collector

class ReportingAgent:
    def __init__(self, model_provider: ModelProvider | None = None, artifact_store: Any = None):
        self.model_provider = model_provider or get_provider("mock")
        self.artifact_store = artifact_store
        self.metrics = create_metric_collector()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            # Generate report from inputs
            prompt = f"Create a report for: {request.instructions}\nContext: {request.inputs}"
            response = await self.model_provider.generate(prompt=prompt, model_id="default")

            # Store report artifact
            artifact_uri = await self.artifact_store.save(content=response.text)

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="reporting-agent",
                status=TaskStatus.COMPLETED,
                summary="Report generated successfully",
                facts=[],
                citations=[],
                proposed_actions=[],
                artifacts=[artifact_uri],
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
                agent_name="reporting-agent",
                status=TaskStatus.FAILED,
                summary=f"Report generation failed: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
