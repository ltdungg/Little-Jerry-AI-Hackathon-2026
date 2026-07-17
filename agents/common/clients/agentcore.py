"""Invoke sibling AgentCore runtimes for true multi-agent delegation.

The orchestrator runtime uses this to call the specialist agent runtimes
(knowledge, project_task, reporting, communication) over the AgentCore data
plane. Sibling ARNs are resolved by runtime NAME at runtime (via the control
plane) to avoid a Terraform dependency cycle between runtimes created together.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from typing import Any

import boto3
import structlog

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult

logger = structlog.get_logger()


class RuntimeInvoker:
    def __init__(self, region: str | None = None, name_prefix: str | None = None) -> None:
        self.region = region or os.getenv("AWS_REGION", "ap-southeast-2")
        # Runtime names are "<prefix>_<agent>" e.g. npo_ai_dev_knowledge.
        self.name_prefix = name_prefix or os.getenv("RUNTIME_NAME_PREFIX", "npo_ai_dev")
        self._control = boto3.client("bedrock-agentcore-control", region_name=self.region)
        self._data = boto3.client("bedrock-agentcore", region_name=self.region)
        self._arn_cache: dict[str, str] = {}

    def _resolve_arn(self, agent_name: str) -> str | None:
        runtime_name = f"{self.name_prefix}_{agent_name}"
        if runtime_name in self._arn_cache:
            return self._arn_cache[runtime_name]
        try:
            next_token: str | None = None
            while True:
                kwargs: dict[str, Any] = {"maxResults": 100}
                if next_token:
                    kwargs["nextToken"] = next_token
                resp = self._control.list_agent_runtimes(**kwargs)
                for rt in resp.get("agentRuntimes", []):
                    if rt.get("agentRuntimeName") == runtime_name:
                        arn = rt["agentRuntimeArn"]
                        self._arn_cache[runtime_name] = arn
                        return arn
                next_token = resp.get("nextToken")
                if not next_token:
                    break
        except Exception as e:  # pragma: no cover - control plane failures
            logger.error("resolve_runtime_arn_failed", agent=agent_name, error=str(e))
        return None

    async def invoke(self, agent_name: str, request: AgentTaskRequest) -> AgentTaskResult | None:
        """Invoke a specialist runtime; returns its result or None if unavailable."""
        arn = self._resolve_arn(agent_name)
        if not arn:
            logger.warning("sibling_runtime_not_found", agent=agent_name)
            return None

        payload = json.dumps(request.model_dump(mode="json")).encode("utf-8")
        session_id = "sess" + uuid.uuid4().hex  # >= 33 chars, alphanumeric

        def _call() -> bytes:
            resp = self._data.invoke_agent_runtime(
                agentRuntimeArn=arn,
                runtimeSessionId=session_id,
                payload=payload,
                contentType="application/json",
                accept="application/json",
            )
            return resp["response"].read()

        try:
            raw = await asyncio.to_thread(_call)
            data = json.loads(raw.decode("utf-8"))
            return AgentTaskResult(**data)
        except Exception as e:
            logger.error("sibling_runtime_invoke_failed", agent=agent_name, error=str(e))
            return None
