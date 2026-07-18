import os
import json
import urllib.parse
import uuid
from typing import Any, Dict, List, Optional

import aiohttp
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

app = FastAPI(title="NPO AI MCP Server")

CLAUDE_API_URL = os.getenv("CLAUDE_API_URL", "https://api.anthropic.com/v1/complete")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
CLAUDE_DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-3.5")
CLAUDE_SYSTEM_PROMPT = os.getenv(
    "CLAUDE_SYSTEM_PROMPT",
    "Bạn là trợ lý AI của một tổ chức phi lợi nhuận tại Việt Nam. Luôn trả lời bằng tiếng Việt, rõ ràng, ngắn gọn và chuyên nghiệp.",
)

OAUTH_CONFIGS = {
    "jira": {
        "client_id": os.getenv("JIRA_CLIENT_ID"),
        "client_secret": os.getenv("JIRA_CLIENT_SECRET"),
        "authorize_url": "https://auth.atlassian.com/authorize",
        "token_url": "https://auth.atlassian.com/oauth/token",
        "scopes": ["offline_access", "read:jira-work", "write:jira-work"],
        "default_redirect_uri": os.getenv("JIRA_OAUTH_REDIRECT_URI", "http://localhost:8000/mcp/oauth/jira/callback"),
        "audience": "api.atlassian.com",
    },
    "slack": {
        "client_id": os.getenv("SLACK_CLIENT_ID"),
        "client_secret": os.getenv("SLACK_CLIENT_SECRET"),
        "authorize_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "scopes": ["chat:write", "channels:read", "groups:read"],
        "default_redirect_uri": os.getenv("SLACK_OAUTH_REDIRECT_URI", "http://localhost:8000/mcp/oauth/slack/callback"),
        "audience": "",
    },
}


class ClaudeRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    temperature: float = 0.3
    max_tokens: int = 1000
    stop_sequences: Optional[List[str]] = None


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
    code_verifier: Optional[str] = None


class SlackMessageRequest(BaseModel):
    channel: str
    text: str
    token: Optional[str] = None
    as_user: Optional[bool] = None
    thread_ts: Optional[str] = None


def _get_oauth_config(provider: str) -> Dict[str, Any]:
    config = OAUTH_CONFIGS.get(provider)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unsupported OAuth provider: {provider}")
    if not config["client_id"] or not config["client_secret"]:
        raise HTTPException(
            status_code=500,
            detail=f"Missing OAuth client configuration for {provider}. Set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET.",
        )
    return config


@app.get("/mcp/ping")
async def ping():
    return {"status": "ok", "service": "mcp_server"}


@app.post("/mcp/claude")
async def claude_complete(request: ClaudeRequest):
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="CLAUDE_API_KEY is not configured")

    payload: Dict[str, Any] = {
        "model": request.model or CLAUDE_DEFAULT_MODEL,
        "prompt": f"{CLAUDE_SYSTEM_PROMPT}\n\n{request.prompt}",
        "temperature": request.temperature,
        "max_tokens_to_sample": request.max_tokens,
    }
    if request.stop_sequences:
        payload["stop_sequences"] = request.stop_sequences

    async with aiohttp.ClientSession() as session:
        async with session.post(
            CLAUDE_API_URL,
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-API-Key": CLAUDE_API_KEY,
            },
            timeout=60,
        ) as resp:
            content = await resp.text()
            if resp.status != 200:
                raise HTTPException(status_code=resp.status, detail=content)
            data = json.loads(content)

    return {
        "model": payload["model"],
        "response": data,
    }


@app.get("/mcp/oauth/{provider}/login")
async def oauth_login(provider: str, redirect_uri: Optional[str] = None):
    config = _get_oauth_config(provider)
    redirect_uri = redirect_uri or config["default_redirect_uri"]
    state = str(uuid.uuid4())

    params = {
        "audience": config.get("audience", ""),
        "client_id": config["client_id"],
        "scope": " ".join(config["scopes"]),
        "redirect_uri": redirect_uri,
        "state": state,
        "response_type": "code",
    }
    if provider == "jira":
        params["prompt"] = "consent"

    params = {k: v for k, v in params.items() if v}
    authorize_url = f"{config['authorize_url']}?{urllib.parse.urlencode(params)}"
    return {"authorize_url": authorize_url, "state": state, "redirect_uri": redirect_uri}


@app.post("/mcp/oauth/{provider}/callback")
async def oauth_callback(provider: str, body: OAuthCallbackRequest):
    config = _get_oauth_config(provider)
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "code": body.code,
        "redirect_uri": body.redirect_uri or config["default_redirect_uri"],
    }
    if body.code_verifier:
        token_payload["code_verifier"] = body.code_verifier

    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    async with aiohttp.ClientSession() as session:
        async with session.post(
            config["token_url"],
            data=token_payload,
            headers=headers,
            timeout=60,
        ) as resp:
            text = await resp.text()
            if resp.status != 200:
                raise HTTPException(status_code=resp.status, detail=text)
            data = json.loads(text)

    return data


@app.post("/mcp/slack/send")
async def slack_send(request: SlackMessageRequest):
    token = request.token or os.getenv("SLACK_ADMIN_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="Slack token is not configured")

    payload: Dict[str, Any] = {
        "channel": request.channel,
        "text": request.text,
    }
    if request.as_user is not None:
        payload["as_user"] = request.as_user
    if request.thread_ts:
        payload["thread_ts"] = request.thread_ts

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://slack.com/api/chat.postMessage",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        ) as resp:
            data = await resp.json()
            if not data.get("ok"):
                raise HTTPException(status_code=502, detail=data)
    return data


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("MCP_SERVER_PORT", "8000"))
    uvicorn.run("mcp_server:app", host="0.0.0.0", port=port, log_level="info")


def main():
    """Entry point for mcp-rest command"""
    import uvicorn
    port = int(os.getenv("MCP_SERVER_PORT", "8000"))
    uvicorn.run("mcp_server:app", host="0.0.0.0", port=port, log_level="info")

