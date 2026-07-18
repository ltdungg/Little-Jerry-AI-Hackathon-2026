"""Decision Tracker Agent - LangGraph-based decision tracking system."""
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Annotated, TypedDict

import structlog
from langgraph.graph import StateGraph, END

from agents.common.clients.dynamodb_client import BusinessDataClient
from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus,
)
from agents.common.model.provider import BedrockProvider

logger = structlog.get_logger()

DEFAULT_TENANT = "aiv"


class DecisionState(TypedDict):
    user_request: str
    project_id: str
    action: str  # record, list_pending, approve, extract
    decisions: Annotated[list[dict], lambda a, b: a + b]
    result: str


class DecisionTrackerAgent:
    """LangGraph-based Decision Tracker."""

    def __init__(self):
        self._provider = BedrockProvider()
        self._client = BusinessDataClient(tenant_id=DEFAULT_TENANT)

    async def route_action_node(self, state: DecisionState) -> dict:
        """Determine which action to take."""
        request = state["user_request"].lower()
        if "phê duyệt" in request or "approve" in request:
            return {"action": "approve"}
        if "liệt kê" in request or "danh sách" in request or "list" in request:
            return {"action": "list_pending"}
        if "trích xuất" in request or "extract" in request:
            return {"action": "extract"}
        return {"action": "record"}

    async def record_decision_node(self, state: DecisionState) -> dict:
        """Record a new decision."""
        project_id = state.get("project_id", "")
        if not project_id:
            return {"result": "Cần project_id để ghi quyết định."}

        decision = {
            "decision_id": f"dec-{uuid.uuid4().hex[:8]}",
            "project_id": project_id,
            "title": state["user_request"][:100],
            "content": state["user_request"],
            "decided_at": datetime.now(timezone.utc).isoformat(),
            "owner_name": "System",
            "approval_status": "draft",
            "effective_status": "active",
        }
        try:
            self._client.put_decision(project_id, decision)
            return {"result": f"Đã ghi quyết định: {decision['title']}", "decisions": [decision]}
        except Exception as e:
            return {"result": f"Lỗi: {str(e)}"}

    async def list_pending_node(self, state: DecisionState) -> dict:
        """List pending decisions."""
        project_id = state.get("project_id", "")
        try:
            if project_id:
                decisions = self._client.list_decisions(project_id, approval_status_filter="ai_suggested")
            else:
                decisions = self._client.list_all_decisions()
                decisions = [d for d in decisions if d.get("approval_status") == "ai_suggested"]

            if not decisions:
                return {"result": "Không có quyết định chờ phê duyệt.", "decisions": []}

            summary = f"Có {len(decisions)} quyết định chờ phê duyệt:"
            return {"result": summary, "decisions": decisions}
        except Exception as e:
            return {"result": f"Lỗi: {str(e)}", "decisions": []}

    async def approve_decision_node(self, state: DecisionState) -> dict:
        """Approve a decision (placeholder - needs decision_id in input)."""
        return {"result": "Cần decision_id để phê duyệt. Vui lòng cung cấp ID quyết định."}

    async def extract_decisions_node(self, state: DecisionState) -> dict:
        """Extract decisions from text using LLM."""
        prompt = f"""Phân tích văn bản và trích xuất quyết định. Trả về JSON:
{{"decisions": [{{"title": "...", "content": "...", "reason": "..."}}]}}

Văn bản:
{state["user_request"]}
"""
        try:
            response = await self._provider.generate(prompt=prompt, temperature=0.1)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            parsed = json.loads(text)
            decisions = parsed.get("decisions", [])
            return {"result": f"Phát hiện {len(decisions)} quyết định.", "decisions": decisions}
        except Exception as e:
            return {"result": f"Lỗi trích xuất: {str(e)}", "decisions": []}

    def _build_graph(self):
        workflow = StateGraph(DecisionState)
        workflow.add_node("route", self.route_action_node)
        workflow.add_node("record", self.record_decision_node)
        workflow.add_node("list_pending", self.list_pending_node)
        workflow.add_node("approve", self.approve_decision_node)
        workflow.add_node("extract", self.extract_decisions_node)

        workflow.set_entry_point("route")

        def after_route(state: DecisionState):
            return state.get("action", "record")

        workflow.add_conditional_edges("route", after_route, {
            "record": "record",
            "list_pending": "list_pending",
            "approve": "approve",
            "extract": "extract",
        })

        for node in ["record", "list_pending", "approve", "extract"]:
            workflow.add_edge(node, END)

        return workflow.compile()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            inputs = request.inputs or {}
            graph = self._build_graph()
            initial = DecisionState(
                user_request=request.instructions,
                project_id=inputs.get("project_id", ""),
                action="",
                decisions=[],
                result="",
            )
            final = await graph.ainvoke(initial)

            return AgentTaskResult(
                workflow_id=request.workflow_id, task_id=request.task_id,
                agent_name="decision-tracker", status=TaskStatus.completed,
                summary="Đã xử lý quyết định.",
                facts=[Fact(key="result", value=final["result"])],
                citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.9, retryable=False,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            return AgentTaskResult(
                workflow_id=request.workflow_id, task_id=request.task_id,
                agent_name="decision-tracker", status=TaskStatus.failed,
                summary=f"Lỗi: {str(e)}",
                facts=[], citations=[], artifacts=[], warnings=[str(e)],
                confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
            )
