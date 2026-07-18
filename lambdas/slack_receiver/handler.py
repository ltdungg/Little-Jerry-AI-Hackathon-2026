"""Slack Event Receiver Lambda.

Handles Slack events:
- bot_mention: User mentions the bot in a channel
- app_mention: App mention event
- message: Messages in channels the bot is in

Flow:
1. Receive Slack event via API Gateway
2. Verify Slack signature
3. Route to Orchestrator Agent via AgentCore
4. Return response to Slack (or post to channel)
"""
import json
import os
import time
import hashlib
import hmac
import urllib.request
import urllib.parse
import boto3
import structlog
from datetime import datetime, timezone

logger = structlog.get_logger()

REGION = os.environ.get("REGION", "ap-southeast-2")
ORCHESTRATOR_RUNTIME_ARN = os.environ.get("ORCHESTRATOR_RUNTIME_ARN", "")
_agentcore = boto3.client("bedrock-agentcore", region_name=REGION)


def _get_slack_signing_secret() -> str:
    """Get Slack signing secret from Secrets Manager."""
    sm = boto3.client("secretsmanager", region_name=REGION)
    try:
        return sm.get_secret_value(SecretId="npo-ai-dev-slack-signing-secret").get("SecretString", "")
    except Exception as e:
        logger.error("get_slack_secret_failed", error=str(e))
        return ""


def _verify_slack_signature(body: str, timestamp: str, signature: str) -> bool:
    """Verify Slack request signature."""
    signing_secret = _get_slack_signing_secret()
    if not signing_secret:
        logger.warning("slack_signing_secret_missing")
        return True  # Skip verification if secret not configured

    # Reject requests older than 5 minutes
    try:
        if abs(time.time() - float(timestamp)) > 300:
            return False
    except (ValueError, TypeError):
        return False

    sig_basestring = f"v0:{timestamp}:{body}"
    computed = "v0=" + hmac.new(
        signing_secret.encode(),
        sig_basestring.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)


def _send_slack_message(channel_id: str, text: str, thread_ts: str = None) -> bool:
    """Send a message to Slack channel."""
    sm = boto3.client("secretsmanager", region_name=REGION)
    try:
        token_data = json.loads(
            sm.get_secret_value(SecretId="npo-ai-dev-slack-admin-access-token").get("SecretString", "{}")
        )
        token = token_data.get("slack_bot_token", "")
    except Exception:
        token = ""

    if not token:
        logger.error("slack_token_missing")
        return False

    payload = {"channel": channel_id, "text": text}
    if thread_ts:
        payload["thread_ts"] = thread_ts

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            return result.get("ok", False)
    except Exception as e:
        logger.error("slack_send_failed", error=str(e))
        return False


def _invoke_orchestrator(message: str, channel_id: str, user_id: str, thread_ts: str = None) -> str:
    """Invoke the Orchestrator Agent via AgentCore."""
    if not ORCHESTRATOR_RUNTIME_ARN:
        return "Orchestrator chưa được cấu hình."

    workflow_id = f"slack-{int(time.time())}"
    task_request = {
        "workflow_id": workflow_id,
        "task_id": f"task-{int(time.time())}",
        "agent_name": "orchestrator",
        "intent": "workflow_orchestration",
        "instructions": message,
        "inputs": {
            "message": message,
            "channel_id": channel_id,
            "user_id": user_id,
            "source": "slack",
            "thread_ts": thread_ts,
        },
        "constraints": {
            "tenant_id": "aiv",
            "project_ids": [],
            "allowed_sources": ["slack", "jira", "knowledge"],
            "deadline_epoch_ms": 0,
            "user_id": user_id,
            "user_role": "staff",
            "session_id": f"slack-{channel_id}-{user_id}",
        },
    }

    session_id = f"sess-slack-{channel_id}-{user_id}".replace("-", "")[:40]

    try:
        resp = _agentcore.invoke_agent_runtime(
            agentRuntimeArn=ORCHESTRATOR_RUNTIME_ARN,
            runtimeSessionId=session_id,
            payload=json.dumps(task_request).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        raw = resp["response"].read()
        result = json.loads(raw.decode("utf-8"))
        return result.get("summary", "Không có phản hồi từ agent.")
    except Exception as e:
        logger.error("orchestrator_invoke_failed", error=str(e))
        return f"Lỗi khi gọi agent: {str(e)}"


def lambda_handler(event, context):
    """Handle Slack events via API Gateway."""
    # Handle URL verification challenge
    body = event.get("body", "{}")
    try:
        payload = json.loads(body) if isinstance(body, str) else body
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON"})}

    # Slack URL verification
    if payload.get("type") == "url_verification":
        return {
            "statusCode": 200,
            "body": json.dumps({"challenge": payload.get("challenge", "")}),
        }

    # Verify signature
    headers = event.get("headers", {})
    timestamp = headers.get("x-slack-request-timestamp", "0")
    signature = headers.get("x-slack-signature", "")
    if not _verify_slack_signature(body, timestamp, signature):
        return {"statusCode": 401, "body": json.dumps({"error": "Invalid signature"})}

    # Handle event callback
    if payload.get("type") == "event_callback":
        slack_event = payload.get("event", {})
        event_type = slack_event.get("type", "")

        # Skip bot's own messages
        if slack_event.get("bot_id"):
            return {"statusCode": 200, "body": json.dumps({"ok": True})}

        if event_type == "app_mention" or event_type == "message":
            text = slack_event.get("text", "")
            channel_id = slack_event.get("channel", "")
            user_id = slack_event.get("user", "")
            thread_ts = slack_event.get("thread_ts") or slack_event.get("ts")

            # Check if bot is mentioned (for app_mention) or if it's a DM
            if event_type == "app_mention" or slack_event.get("channel_type") == "im":
                # Remove bot mention from text
                import re
                clean_text = re.sub(r"<@[A-Z0-9]+>", "", text).strip()

                if clean_text:
                    # Invoke orchestrator asynchronously
                    response_text = _invoke_orchestrator(clean_text, channel_id, user_id, thread_ts)

                    # Send response back to Slack
                    _send_slack_message(channel_id, response_text, thread_ts)

        return {"statusCode": 200, "body": json.dumps({"ok": True})}

    return {"statusCode": 200, "body": json.dumps({"ok": True})}
