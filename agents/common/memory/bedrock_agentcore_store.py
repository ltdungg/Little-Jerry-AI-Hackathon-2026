"""Strands MemoryStore backed by Amazon Bedrock AgentCore Memory.

Wraps the boto3 bedrock-agentcore client to implement the Strands MemoryStore
protocol. Each conversation is isolated by a namespace (session_id).
"""
from __future__ import annotations

import os
import uuid
from typing import Any

import boto3
import structlog
from strands.memory.types import MemoryEntry, MemoryStore, SearchOptions

logger = structlog.get_logger()


class BedrockAgentCoreMemoryStore(MemoryStore):
    """MemoryStore implementation using Bedrock AgentCore Memory API."""

    def __init__(
        self,
        memory_id: str,
        namespace: str = "default",
        region: str | None = None,
    ):
        self.name = "bedrock_agentcore_memory"
        self.description = "Conversation memory stored in Bedrock AgentCore"
        self.writable = True
        self._memory_id = memory_id
        self._namespace = namespace
        self._region = region or os.getenv("AWS_REGION", "ap-southeast-2")
        self._client = boto3.client("bedrock-agentcore", region_name=self._region)

    async def search(self, query: str, options: SearchOptions | None = None) -> list[MemoryEntry]:
        """Search memory records for relevant past conversations."""
        try:
            params: dict[str, Any] = {
                "memoryId": self._memory_id,
                "namespace": self._namespace,
                "maxResults": 10,
            }
            if query:
                params["searchCriteria"] = {"searchQuery": query}

            response = self._client.retrieve_memory_records(**params)
            entries = []
            for record in response.get("records", []):
                content = record.get("content", {})
                text = content.get("text", "") if isinstance(content, dict) else str(content)
                if text:
                    entries.append(
                        MemoryEntry(
                            content=text,
                            store_name=self.name,
                            metadata={"recordId": record.get("recordId", ""), "namespace": self._namespace},
                        )
                    )
            return entries
        except Exception as e:
            logger.warning("memory_search_failed", error=str(e))
            return []

    async def add(self, content: str, metadata: dict[str, Any] | None = None) -> Any:
        """Add a single memory record."""
        try:
            self._client.batch_create_memory_records(
                memoryId=self._memory_id,
                records=[
                    {
                        "content": {"text": content},
                        "metadata": metadata or {},
                    }
                ],
                clientToken=str(uuid.uuid4()),
            )
        except Exception as e:
            logger.warning("memory_add_failed", error=str(e))

    async def add_messages(self, messages: list[Any], context: Any = None) -> Any:
        """Add conversation messages to memory."""
        try:
            records = []
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
                    records.append({
                        "content": {"text": f"[{role}] {text}"},
                        "metadata": {"role": role, "namespace": self._namespace},
                    })

            if records:
                self._client.batch_create_memory_records(
                    memoryId=self._memory_id,
                    records=records,
                    clientToken=str(uuid.uuid4()),
                )
        except Exception as e:
            logger.warning("memory_add_messages_failed", error=str(e))

    async def initialize(self) -> None:
        """No-op: memory resource is created by Terraform."""

    def get_tools(self) -> list[Any]:
        """No extra tools needed."""
        return []
