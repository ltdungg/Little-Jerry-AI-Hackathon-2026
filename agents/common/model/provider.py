import asyncio
import os
from typing import Any, Protocol
from dataclasses import dataclass

import boto3
import structlog

logger = structlog.get_logger()

# Default model when a caller passes a placeholder id ("mock"/"default"/empty).
DEFAULT_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-lite-v1:0")
_PLACEHOLDER_MODEL_IDS = {"", "mock", "default"}


@dataclass
class ModelResponse:
    text: str
    input_tokens: int
    output_tokens: int
    model_id: str


class ModelProvider(Protocol):
    async def generate(
        self, prompt: str, model_id: str = "", temperature: float = 0.3, max_tokens: int = 2048
    ) -> ModelResponse: ...


class BedrockProvider:
    """Calls Amazon Bedrock via the Converse API.

    In ap-southeast-2 most models require a cross-region inference profile id
    (e.g. apac.amazon.nova-lite-v1:0), which is supplied via BEDROCK_MODEL_ID.
    """

    def __init__(self) -> None:
        region = os.getenv("AWS_REGION", "ap-southeast-2")
        self._client = boto3.client("bedrock-runtime", region_name=region)
        self._default_model = DEFAULT_MODEL_ID

    async def generate(
        self, prompt: str, model_id: str = "", temperature: float = 0.3, max_tokens: int = 2048
    ) -> ModelResponse:
        resolved = self._default_model if (model_id or "") in _PLACEHOLDER_MODEL_IDS else model_id
        logger.info("bedrock_generate", model_id=resolved, prompt_length=len(prompt))

        def _call() -> dict[str, Any]:
            return self._client.converse(
                modelId=resolved,
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"temperature": temperature, "maxTokens": max_tokens},
            )

        # boto3 is blocking; run it off the event loop so async handlers don't stall.
        response = await asyncio.to_thread(_call)

        text = ""
        for block in response["output"]["message"]["content"]:
            if "text" in block:
                text += block["text"]

        usage = response.get("usage", {})
        input_tokens = usage.get("inputTokens", 0)
        output_tokens = usage.get("outputTokens", 0)
        logger.info(
            "bedrock_response", model_id=resolved, input_tokens=input_tokens, output_tokens=output_tokens
        )

        return ModelResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_id=resolved,
        )


class MockProvider:
    async def generate(
        self, prompt: str, model_id: str = "", temperature: float = 0.3, max_tokens: int = 2048
    ) -> ModelResponse:
        return ModelResponse("mock response", 0, 0, model_id)


def get_provider(provider_type: str | None = None) -> ModelProvider:
    # Default provider is driven by MODEL_PROVIDER env (bedrock unless overridden).
    provider_type = provider_type or os.getenv("MODEL_PROVIDER", "bedrock")
    if provider_type == "mock":
        return MockProvider()
    return BedrockProvider()
