"""Shared Context Bus for cross-agent communication.

Allows agents to read/write shared state during a workflow execution.
"""
import json
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentTrace:
    agent_name: str
    action: str
    result_summary: str
    timestamp: float = field(default_factory=time.time)
    latency_ms: int = 0


@dataclass
class SharedContext:
    """Mutable context shared across agents in a single request."""

    # Core identifiers
    tenant_id: str = "aiv"
    user_id: str = ""
    user_role: str = "volunteer"
    session_id: str = ""

    # Project context
    project_id: str = ""
    jira_project_key: str = ""
    slack_channel_id: str = ""

    # Collected data from agents
    collected_facts: list[dict] = field(default_factory=list)
    collected_citations: list[dict] = field(default_factory=list)

    # Agent execution trace
    agent_trace: list[AgentTrace] = field(default_factory=list)

    # Shared state bag
    state: dict[str, Any] = field(default_factory=dict)

    # Error tracking
    errors: list[str] = field(default_factory=list)

    def add_fact(self, key: str, value: str, source: str = "") -> None:
        self.collected_facts.append({
            "key": key,
            "value": value,
            "source": source,
            "timestamp": time.time(),
        })

    def add_citation(self, citation: dict) -> None:
        citation["timestamp"] = time.time()
        self.collected_citations.append(citation)

    def trace(self, agent_name: str, action: str, result_summary: str, latency_ms: int = 0) -> None:
        self.agent_trace.append(AgentTrace(
            agent_name=agent_name,
            action=action,
            result_summary=result_summary[:200],
            latency_ms=latency_ms,
        ))

    def add_error(self, error: str) -> None:
        self.errors.append(error)

    def get_facts_by_source(self, source: str) -> list[dict]:
        return [f for f in self.collected_facts if f.get("source") == source]

    def get_all_evidence(self) -> str:
        """Format all collected facts as evidence text for the synthesizer."""
        parts = []
        for fact in self.collected_facts:
            source = fact.get("source", "unknown")
            parts.append(f"[{source.upper()}] {fact['value']}")
        return "\n\n".join(parts)

    def get_trace_summary(self) -> str:
        """Format agent trace for debugging."""
        lines = []
        for t in self.agent_trace:
            lines.append(f"  {t.agent_name}: {t.action} ({t.latency_ms}ms) — {t.result_summary[:80]}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "project_id": self.project_id,
            "jira_project_key": self.jira_project_key,
            "slack_channel_id": self.slack_channel_id,
            "facts_count": len(self.collected_facts),
            "citations_count": len(self.collected_citations),
            "errors_count": len(self.errors),
            "trace": self.get_trace_summary(),
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
