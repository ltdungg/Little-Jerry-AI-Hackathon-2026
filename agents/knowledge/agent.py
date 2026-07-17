import os
import time
import uuid
from datetime import datetime, timezone
from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact
from agents.common.contracts.citation import Citation, SourceSystem
from agents.common.contracts.agent import TaskStatus
from agents.common.model.provider import ModelProvider, get_provider
from agents.common.observability.metrics import create_metric_collector

class KnowledgeAgent:
    def __init__(self, model_provider: ModelProvider | None = None):
        self.model_provider = model_provider or get_provider()
        self.model_id = os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-lite-v1:0")
        self.metrics = create_metric_collector()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            allowed_sources = request.constraints.allowed_sources if request.constraints else []
            citations = []
            facts = []

            prompt = f"Search organizational knowledge for: {request.instructions}\nAllowed sources: {allowed_sources}"

            response = await self.model_provider.generate(
                prompt=prompt,
                model_id=self.model_id,
                temperature=0.3,
                max_tokens=2048,
            )

            if response.text and "insufficient" not in response.text.lower():
                citation = Citation(
                    source_system=SourceSystem.S3,
                    document_id="doc-seed-001",
                    document_title="Organizational Knowledge",
                    source_uri="s3://curated/tenant-aiv/general/doc-seed-001.txt",
                    excerpt=response.text[:500],
                    last_modified_at=datetime.now(timezone.utc),
                )
                citations.append(citation)
                facts.append(Fact(key="answer", value=response.text))

            latency = int((time.time() - start) * 1000)
            self.metrics.record("knowledge_agent.latency_ms", latency)
            self.metrics.record("knowledge_agent.tokens", response.output_tokens)

            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="knowledge-agent",
                status=TaskStatus.completed,
                summary=response.text[:200] if response.text else "No results found",
                facts=facts,
                citations=citations,
                proposed_actions=[],
                artifacts=[],
                warnings=[],
                confidence=0.8 if citations else 0.0,
                retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=response.input_tokens, output_tokens=response.output_tokens),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="knowledge-agent",
                status=TaskStatus.failed,
                summary=f"Knowledge retrieval failed: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
