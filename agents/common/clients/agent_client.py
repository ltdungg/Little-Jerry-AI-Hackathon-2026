from typing import Protocol
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class AgentTaskRequest:
    task_id: str
    intent: str
    payload: Dict[str, Any]

@dataclass
class AgentTaskResult:
    success: bool
    data: Dict[str, Any]
    error: str | None = None

@dataclass
class RequestContext:
    tenant_id: str
    project_id: str
    user_id: str
    correlation_id: str

class AgentClient(Protocol):
    async def invoke(self, agent_name: str, request: AgentTaskRequest, context: RequestContext) -> AgentTaskResult: ...

class LocalAgentClient:
    def __init__(self, agent_registry: Dict[str, Any]):
        self.agent_registry = agent_registry

    async def invoke(self, agent_name: str, request: AgentTaskRequest, context: RequestContext) -> AgentTaskResult:
        agent = self.agent_registry.get(agent_name)
        if not agent:
            return AgentTaskResult(success=False, data={}, error=f"Agent {agent_name} not found")
        return await agent.run(request, context)

class AgentCoreRuntimeClient:
    def __init__(self, endpoint_url: str, session_id: str):
        self.endpoint_url = endpoint_url
        self.session_id = session_id
        # Initialize boto3 client here

    async def invoke(self, agent_name: str, request: AgentTaskRequest, context: RequestContext) -> AgentTaskResult:
        # Implementation using boto3 invoke_agent_runtime
        return AgentTaskResult(success=True, data={})

class A2AAgentClient:
    async def invoke(self, agent_name: str, request: AgentTaskRequest, context: RequestContext) -> AgentTaskResult:
        # Stub implementation for A2A
        return AgentTaskResult(success=True, data={})
