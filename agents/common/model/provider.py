from typing import Any, Protocol
from dataclasses import dataclass
import os
import boto3
import structlog

logger = structlog.get_logger()

@dataclass
class ModelResponse:
    text: str
    input_tokens: int
    output_tokens: int
    model_id: str

class ModelProvider(Protocol):
    def generate(self, prompt: str, model_id: str, temperature: float, max_tokens: int) -> ModelResponse: ...

class BedrockProvider:
    def __init__(self):
        region = os.getenv("AWS_REGION", "ap-southeast-2")
        self._client = boto3.client("bedrock-runtime", region_name=region)

    def generate(self, prompt: str, model_id: str, temperature: float, max_tokens: int) -> ModelResponse:
        logger.info("bedrock_generate", model_id=model_id, prompt_length=len(prompt))

        response = self._client.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={
                "temperature": temperature,
                "maxTokens": max_tokens,
            },
        )

        text = ""
        for block in response["output"]["message"]["content"]:
            if "text" in block:
                text += block["text"]

        usage = response.get("usage", {})
        input_tokens = usage.get("inputTokens", 0)
        output_tokens = usage.get("outputTokens", 0)

        logger.info("bedrock_response", model_id=model_id, input_tokens=input_tokens, output_tokens=output_tokens)

        return ModelResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_id=model_id,
        )

class MockProvider:
    def generate(self, prompt: str, model_id: str, temperature: float, max_tokens: int) -> ModelResponse:
        return ModelResponse("mock response", 0, 0, model_id)

def get_provider(provider_type: str = "bedrock") -> ModelProvider:
    if provider_type == "mock":
        return MockProvider()
    return BedrockProvider()
