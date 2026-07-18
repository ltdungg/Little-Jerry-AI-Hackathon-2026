"""Strands MemoryStore backed by Amazon Bedrock AgentCore Memory.

Wraps the boto3 bedrock-agentcore client to implement the Strands MemoryStore
protocol.

Conversational-memory pipeline
------------------------------
Raw conversation turns are written as *events* via ``create_event`` (keyed by
actor + session). The AgentCore memory resource has extraction *strategies*
configured (see infra/modules/agentcore-memory) that asynchronously distil
those events into long-term *memory records* under a deterministic namespace.
``search`` then runs semantic retrieval over those records.

Namespaces must match the strategy ``namespaces`` templates declared in
Terraform:
    semantic:  conversation/semantic/{actorId}
    summary:   conversation/summary/{actorId}/{sessionId}
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3
import structlog
from strands.memory.types import MemoryEntry, MemoryStore, SearchOptions

logger = structlog.get_logger()

# AgentCore conversational roles.
_ROLE_MAP = {
    "user": "USER",
    "assistant": "ASSISTANT",
    "tool": "TOOL",
    "system": "OTHER",
}


class BedrockAgentCoreMemoryStore(MemoryStore):
    """MemoryStore implementation using Bedrock AgentCore Memory API."""

    def __init__(
        self,
        memory_id: str,
        namespace: str = "default",
        region: str | None = None,
        actor_id: str | None = None,
        session_id: str | None = None,
    ):
        self.name = "bedrock_agentcore_memory"
        self.description = "Conversation memory stored in Bedrock AgentCore"
        self.writable = True
        self._memory_id = memory_id
        # Backwards-compatible: callers pass ``namespace=session_id``.
        self._session_id = session_id or namespace
        # Actor identifies the "who" the memory belongs to (user/tenant). Fall
        # back to the session so single-session callers keep working.
        self._actor_id = actor_id or namespace
        self._region = region or os.getenv("AWS_REGION", "ap-southeast-2")
        self._client = boto3.client("bedrock-agentcore", region_name=self._region)
        # Namespace where the semantic strategy writes extracted records and
        # where manual records are stored, so both are retrievable together.
        self._record_namespace = f"conversation/semantic/{self._actor_id}"

    async def search(self, query: str, options: SearchOptions | None = None) -> list[MemoryEntry]:
        """Search extracted memory records for relevant past conversations."""
        try:
            # searchCriteria (with searchQuery) is REQUIRED by the API. When no
            # query is supplied, fall back to a broad term so semantic search
            # returns the most relevant recent records instead of erroring.
            params: dict[str, Any] = {
                "memoryId": self._memory_id,
                "namespace": self._record_namespace,
                "maxResults": 10,
                "searchCriteria": {"searchQuery": query or "conversation history"},
            }

            response = self._client.retrieve_memory_records(**params)
            entries = []
            for record in response.get("memoryRecordSummaries", []):
                content = record.get("content", {})
                text = content.get("text", "") if isinstance(content, dict) else str(content)
                if text:
                    entries.append(
                        MemoryEntry(
                            content=text,
                            store_name=self.name,
                            metadata={
                                "recordId": record.get("memoryRecordId", ""),
                                "namespace": self._record_namespace,
                            },
                        )
                    )
            return entries
        except Exception as e:
            logger.warning("memory_search_failed", error=str(e))
            return []

    def add_record(self, content: str, metadata: dict[str, Any] | None = None) -> None:
        """Synchronously add a single long-term memory record (manual override).

        The AgentCore client is blocking, so this is a plain sync call. Use it
        from synchronous contexts (e.g. Strands tools already running inside an
        event loop) to avoid nesting a second loop.
        """
        try:
            self._client.batch_create_memory_records(
                memoryId=self._memory_id,
                records=[
                    {
                        "requestIdentifier": str(uuid.uuid4()),
                        "namespaces": [self._record_namespace],
                        "content": {"text": content},
                        "timestamp": datetime.now(timezone.utc),
                    }
                ],
                clientToken=str(uuid.uuid4()),
            )
        except Exception as e:
            logger.warning("memory_add_failed", error=str(e))

    async def add(self, content: str, metadata: dict[str, Any] | None = None) -> Any:
        """Add a single long-term memory record directly (manual override).

        Used for institutional knowledge the agent extracts explicitly, rather
        than turns that flow through the strategy pipeline. Written to the same
        namespace as extracted records so ``search`` surfaces both.
        """
        self.add_record(content, metadata)

    async def add_messages(self, messages: list[Any], context: Any = None) -> Any:
        """Persist conversation turns as events, feeding the extraction pipeline.

        Each turn becomes a ``conversational`` payload entry on a single
        ``create_event`` call, keyed by actor + session. The configured memory
        strategies asynchronously extract long-term records from these events.
        """
        try:
            payload = []
            for msg in messages:
                # Support both Strands Message objects and plain dicts
                if hasattr(msg, "role") and hasattr(msg, "content"):
                    role = msg.role
                    content = msg.content
                elif isinstance(msg, dict):
                    role = msg.get("role", "unknown")
                    content = msg.get("content", "")
                else:
                    continue

                # Extract text from content (may be list of content blocks)
                if isinstance(content, list):
                    text_parts = []
                    for block in content:
                        if isinstance(block, dict) and "text" in block:
                            text_parts.append(block["text"])
                        elif isinstance(block, str):
                            text_parts.append(block)
                    text = "\n".join(text_parts)
                elif isinstance(content, str):
                    text = content
                else:
                    text = str(content)

                if text.strip():
                    payload.append({
                        "conversational": {
                            "content": {"text": text},
                            "role": _ROLE_MAP.get(str(role).lower(), "OTHER"),
                        }
                    })

            if payload:
                self._client.create_event(
                    memoryId=self._memory_id,
                    actorId=self._actor_id,
                    sessionId=self._session_id,
                    eventTimestamp=datetime.now(timezone.utc),
                    payload=payload,
                    clientToken=str(uuid.uuid4()),
                )
        except Exception as e:
            logger.warning("memory_add_messages_failed", error=str(e))

    async def initialize(self) -> None:
        """No-op: memory resource is created by Terraform."""

    def get_tools(self) -> list[Any]:
        """No extra tools needed."""
        return []
