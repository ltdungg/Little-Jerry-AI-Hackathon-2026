"""Alert Manager Agent - LangGraph-based proactive notification system."""
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


class AlertState(TypedDict):
    user_request: str
    project_id: str
    alerts: Annotated[list[dict], lambda a, b: a + b]
    briefing: str
    action_taken: str


class AlertManagerAgent:
    """LangGraph-based Alert Manager."""

    def __init__(self):
        self._provider = BedrockProvider()
        self._client = BusinessDataClient(tenant_id=DEFAULT_TENANT)

    async def check_overdue_node(self, state: AlertState) -> dict:
        """Check overdue tasks."""
        project_id = state.get("project_id", "")
        try:
            tasks = self._client.list_tasks(project_id) if project_id else self._client.list_all_tasks()
            overdue = []
            for t in tasks:
                due = t.get("due_date")
                status = t.get("status", "")
                if due and status not in ("done", "completed", "cancelled"):
                    try:
                        if datetime.fromisoformat(due) < datetime.now(timezone.utc):
                            overdue.append({
                                "type": "overdue_task",
                                "severity": "high" if t.get("priority") == "critical" else "medium",
                                "title": t.get("title"),
                                "assignee": t.get("assignee", {}).get("display_name", "Unassigned"),
                                "due_date": due,
                            })
                    except (ValueError, TypeError):
                        pass
            return {"alerts": overdue}
        except Exception as e:
            logger.error("check_overdue_failed", error=str(e))
            return {"alerts": []}

    async def check_risks_node(self, state: AlertState) -> dict:
        """Check critical risks."""
        project_id = state.get("project_id", "")
        try:
            risks = self._client.list_risks(project_id) if project_id else self._client.list_all_risks()
            critical = [
                {"type": "critical_risk", "severity": "critical", "title": r.get("title"),
                 "owner": r.get("owner", {}).get("display_name", "Unassigned")}
                for r in risks
                if r.get("severity") in ("critical", "high") and r.get("status") == "open"
            ]
            return {"alerts": critical}
        except Exception as e:
            logger.error("check_risks_failed", error=str(e))
            return {"alerts": []}

    async def check_projects_node(self, state: AlertState) -> dict:
        """Check project health."""
        try:
            projects = self._client.list_projects()
            alerts = [
                {"type": "project_overdue", "severity": "critical", "title": f"Dự án {p.get('name')} quá hạn"}
                for p in projects if p.get("health") == "red"
            ]
            return {"alerts": alerts}
        except Exception as e:
            logger.error("check_projects_failed", error=str(e))
            return {"alerts": []}

    async def synthesize_node(self, state: AlertState) -> dict:
        """Generate briefing from all alerts."""
        alerts = state.get("alerts", [])
        if not alerts:
            return {"briefing": "✅ Không có cảnh báo nào. Tất cả đều ổn."}

        # Sort by severity
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        alerts.sort(key=lambda a: severity_order.get(a.get("severity", "low"), 4))

        lines = ["📊 **Daily Briefing:**"]
        for a in alerts[:10]:
            icon = "🔴" if a.get("severity") == "critical" else "🟡" if a.get("severity") == "high" else "⚪"
            lines.append(f"{icon} {a.get('title', 'Unknown')}")

        return {"briefing": "\n".join(lines)}

    def _build_graph(self):
        workflow = StateGraph(AlertState)
        workflow.add_node("check_overdue", self.check_overdue_node)
        workflow.add_node("check_risks", self.check_risks_node)
        workflow.add_node("check_projects", self.check_projects_node)
        workflow.add_node("synthesize", self.synthesize_node)

        workflow.set_entry_point("check_overdue")
        workflow.add_edge("check_overdue", "check_risks")
        workflow.add_edge("check_risks", "check_projects")
        workflow.add_edge("check_projects", "synthesize")
        workflow.add_edge("synthesize", END)

        return workflow.compile()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            inputs = request.inputs or {}
            graph = self._build_graph()
            initial = AlertState(
                user_request=request.instructions,
                project_id=inputs.get("project_id", ""),
                alerts=[],
                briefing="",
                action_taken="",
            )
            final = await graph.ainvoke(initial)

            return AgentTaskResult(
                workflow_id=request.workflow_id, task_id=request.task_id,
                agent_name="alert-manager", status=TaskStatus.completed,
                summary="Đã kiểm tra cảnh báo thành công.",
                facts=[Fact(key="briefing", value=final["briefing"])],
                citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.9, retryable=False,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            return AgentTaskResult(
                workflow_id=request.workflow_id, task_id=request.task_id,
                agent_name="alert-manager", status=TaskStatus.failed,
                summary=f"Lỗi: {str(e)}",
                facts=[], citations=[], artifacts=[], warnings=[str(e)],
                confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=int((time.time() - start) * 1000), input_tokens=0, output_tokens=0),
            )
