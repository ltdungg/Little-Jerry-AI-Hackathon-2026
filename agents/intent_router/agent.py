"""Intent Router - LangGraph-based classifier that routes queries to the right agent."""
import json
import os
import time
from enum import Enum
from typing import Annotated, TypedDict

import structlog
from langgraph.graph import StateGraph, END

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, TaskStatus,
    TaskIntent, TaskConstraints,
)
from agents.common.model.provider import BedrockProvider

logger = structlog.get_logger()


class Intent(str, Enum):
    JIRA_QUERY = "jira_query"
    JIRA_ACTION = "jira_action"
    SLACK_ACTION = "slack_action"
    RISK_CHECK = "risk_check"
    REPORT_GEN = "report_gen"
    KNOWLEDGE_SEARCH = "knowledge_search"
    MULTI_STEP = "multi_step"
    GREETING = "greeting"
    UNKNOWN = "unknown"


INTENT_TO_AGENT = {
    Intent.JIRA_QUERY: "project_task",
    Intent.JIRA_ACTION: "project_task",
    Intent.SLACK_ACTION: "communication",
    Intent.RISK_CHECK: "risk_analysis",
    Intent.REPORT_GEN: "reporting",
    Intent.KNOWLEDGE_SEARCH: "knowledge",
    Intent.GREETING: "orchestrator",
}


class RouterState(TypedDict):
    query: str
    intent: str
    target_agent: str
    confidence: float


def keyword_classify(query: str) -> str:
    """Fast keyword-based classification."""
    q = query.lower().strip()

    greeting_words = ["xin chào", "chào", "hello", "hi", "hey", "cảm ơn", "thank", "ok"]
    if any(w in q for w in greeting_words) and len(q.split()) < 10:
        return Intent.GREETING.value

    jira_action = ["tạo task", "create task", "cập nhật task", "update task", "chuyển trạng thái"]
    if any(w in q for w in jira_action):
        return Intent.JIRA_ACTION.value

    jira_kw = ["task", "nhiệm vụ", "jira", "issue", "sprint", "backlog", "assignee", "todo", "done"]
    if any(w in q for w in jira_kw):
        return Intent.JIRA_QUERY.value

    slack_kw = ["slack", "channel", "tin nhắn", "message", "chat", "gửi tin"]
    if any(w in q for w in slack_kw):
        return Intent.SLACK_ACTION.value

    risk_kw = ["rủi ro", "risk", "cảnh báo", "alert", "blocker", "milestone"]
    if any(w in q for w in risk_kw):
        return Intent.RISK_CHECK.value

    report_kw = ["báo cáo", "report", "daily", "weekly", "tổng hợp", "summary"]
    if any(w in q for w in report_kw):
        return Intent.REPORT_GEN.value

    knowledge_kw = ["tìm kiếm", "search", "tài liệu", "document", "quy trình", "policy"]
    if any(w in q for w in knowledge_kw):
        return Intent.KNOWLEDGE_SEARCH.value

    return Intent.UNKNOWN.value


class IntentRouterAgent:
    """LangGraph-based Intent Router."""

    def __init__(self):
        self._provider = BedrockProvider()

    async def classify_node(self, state: RouterState) -> dict:
        """Classify intent using keyword matching first, LLM fallback."""
        query = state["query"]

        # Fast path: keyword matching
        intent_str = keyword_classify(query)

        if intent_str != Intent.UNKNOWN.value:
            agent = INTENT_TO_AGENT.get(Intent(intent_str), "orchestrator")
            return {"intent": intent_str, "target_agent": agent, "confidence": 0.85}

        # LLM fallback for unknown
        prompt = f"""Phân loại ý định người dùng. Trả về JSON:
{{"intent": "jira_query|jira_action|slack_action|risk_check|report_gen|knowledge_search|greeting|unknown"}}

Câu hỏi: "{query}"
"""
        try:
            response = await self._provider.generate(prompt=prompt, temperature=0.0)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            parsed = json.loads(text)
            intent_str = parsed.get("intent", Intent.UNKNOWN.value)
            intent = Intent(intent_str) if intent_str in [i.value for i in Intent] else Intent.UNKNOWN
            agent = INTENT_TO_AGENT.get(intent, "orchestrator")
            return {"intent": intent.value, "target_agent": agent, "confidence": 0.7}
        except Exception as e:
            logger.error("llm_classify_failed", error=str(e))
            return {"intent": Intent.UNKNOWN.value, "target_agent": "orchestrator", "confidence": 0.0}

    def _build_graph(self):
        workflow = StateGraph(RouterState)
        workflow.add_node("classify", self.classify_node)
        workflow.set_entry_point("classify")
        workflow.add_edge("classify", END)
        return workflow.compile()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            graph = self._build_graph()
            initial = RouterState(query=request.instructions, intent="", target_agent="", confidence=0.0)
            final = await graph.ainvoke(initial)

            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="intent-router",
                status=TaskStatus.completed,
                summary=json.dumps({
                    "intent": final["intent"],
                    "target_agent": final["target_agent"],
                    "confidence": final["confidence"],
                }),
                facts=[], citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=final["confidence"], retryable=False,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            return AgentTaskResult(
                workflow_id=request.workflow_id, task_id=request.task_id,
                agent_name="intent-router", status=TaskStatus.failed,
                summary=f"Intent classification failed: {str(e)}",
                facts=[], citations=[], artifacts=[], warnings=[str(e)],
                confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
            )
