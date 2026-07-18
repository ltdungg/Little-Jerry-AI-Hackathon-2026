import os
import signal
import asyncio
import importlib
import json
import structlog
from aiohttp import web

logger = structlog.get_logger()

AGENT_NAME = os.getenv("AGENT_NAME", "orchestrator")

AGENT_MODULE_MAP = {
    "orchestrator": "agents.orchestrator.agent",
    "knowledge": "agents.knowledge.agent",
    "project_task": "agents.project_task.agent",
    "reporting": "agents.reporting.agent",
    "communication": "agents.communication.agent",
    "memory_extraction": "agents.memory_extraction.agent",
    "risk_analysis": "agents.risk_analysis.agent",
    "alert_manager": "agents.alert_manager.agent",
    "decision_tracker": "agents.decision_tracker.agent",
    "intent_router": "agents.intent_router.agent",
}

# Cache the loaded agent handler
_agent_handler = None


def _load_agent():
    global _agent_handler
    if _agent_handler is not None:
        return _agent_handler

    module_path = AGENT_MODULE_MAP.get(AGENT_NAME)
    if not module_path:
        raise ValueError(f"Unknown agent: {AGENT_NAME}")

    module = importlib.import_module(module_path)

    # Each agent module exposes a class like OrchestratorAgent, KnowledgeAgent, etc.
    agent_class_name = {
        "orchestrator": "OrchestratorAgent",
        "knowledge": "KnowledgeAgent",
        "project_task": "ProjectTaskAgent",
        "reporting": "ReportingAgent",
        "communication": "CommunicationAgent",
        "memory_extraction": "MemoryExtractionAgent",
        "risk_analysis": "RiskAnalysisAgent",
        "alert_manager": "AlertManagerAgent",
        "decision_tracker": "DecisionTrackerAgent",
        "intent_router": "IntentRouterAgent",
    }[AGENT_NAME]

    agent_class = getattr(module, agent_class_name)
    _agent_handler = agent_class()
    logger.info("agent_loaded", agent=AGENT_NAME, module=module_path)
    return _agent_handler


async def handle_ping(request):
    return web.json_response({"status": "healthy", "agent": AGENT_NAME})


async def handle_invocations(request):
    from agents.common.contracts.agent import AgentTaskRequest

    try:
        raw_body = await request.read()
        data = json.loads(raw_body.decode("utf-8"))
        agent = _load_agent()

        # Parse request into contract model
        task_request = AgentTaskRequest(**data)

        # Run agent handler
        if hasattr(agent, "handle"):
            result = await agent.handle(task_request)
        elif hasattr(agent, "run_task"):
            result = await agent.run_task(task_request)
        else:
            return web.json_response(
                {"error": f"Agent {AGENT_NAME} has no handle/run_task method"},
                status=500,
            )

        # Serialize result
        if hasattr(result, "model_dump"):
            response_data = result.model_dump(mode="json")
        else:
            response_data = result

        return web.json_response(response_data)

    except Exception as e:
        logger.error("task_execution_failed", error=str(e), agent=AGENT_NAME)
        return web.json_response(
            {
                "status": "failed",
                "agent_name": AGENT_NAME,
                "summary": f"Lỗi agent: {str(e)}",
                "retryable": True,
            },
            status=500,
        )


async def start_server():
    app = web.Application()
    app.add_routes(
        [
            web.get("/ping", handle_ping),
            web.post("/invocations", handle_invocations),
        ]
    )

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)
    await site.start()
    logger.info("server_started", agent=AGENT_NAME, port=8080)

    # Wait for SIGTERM
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGTERM, stop_event.set)
    await stop_event.wait()

    logger.info("shutting_down", agent=AGENT_NAME)
    await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(start_server())
