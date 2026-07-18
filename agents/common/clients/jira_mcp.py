"""
Jira MCP Client - connects to Jira via AgentCore Gateway.

Architecture (Hybrid):
  - Tasks live in Jira (source of truth)
  - DynamoDB stores aggregated metrics + app-specific data
  - This client queries Jira through the AgentCore Gateway MCP endpoint

Auth flow:
  1. Get Cognito JWT token using client_credentials grant
  2. Use JWT to authenticate with AgentCore Gateway
  3. Gateway proxies requests to Jira MCP server
"""
import os
import json
import time
import asyncio
import urllib.request
import urllib.parse
import structlog

logger = structlog.get_logger()

# Cache JWT token to avoid re-auth on every call
_token_cache = {"token": "", "expires_at": 0}


def _get_gateway_jwt_token() -> str:
    """Get Cognito JWT token for AgentCore Gateway authentication.

    Uses USER_PASSWORD_AUTH flow (works with both explicit auth flows).
    Falls back to client_credentials if configured.
    """
    now = time.time()

    # Return cached token if still valid (with 5 min buffer)
    if _token_cache["token"] and now < _token_cache["expires_at"] - 300:
        return _token_cache["token"]

    client_id = os.environ.get("GATEWAY_CLIENT_ID", "")
    client_secret = os.environ.get("GATEWAY_CLIENT_SECRET", "")
    user_pool_id = os.environ.get("GATEWAY_USER_POOL_ID", "")
    username = os.environ.get("GATEWAY_USERNAME", "")
    password = os.environ.get("GATEWAY_PASSWORD", "")
    region = os.environ.get("AWS_REGION", "ap-southeast-2")

    if not client_id or not user_pool_id:
        logger.error("gateway_auth_config_missing")
        return ""

    # Try USER_PASSWORD_AUTH first (works with test users)
    if username and password:
        try:
            import hashlib
            import base64

            # Compute SECRET_HASH if client has a secret
            secret_hash = ""
            if client_secret:
                import hmac as hmac_mod
                msg = f"{username}{client_id}".encode("utf-8")
                key = client_secret.encode("utf-8")
                secret_hash = base64.b64encode(
                    hmac_mod.new(key, msg, hashlib.sha256).digest()
                ).decode("utf-8")

            auth_url = f"https://cognito-idp.{region}.amazonaws.com/"
            payload = {
                "AuthFlow": "USER_PASSWORD_AUTH",
                "ClientId": client_id,
                "AuthParameters": {
                    "USERNAME": username,
                    "PASSWORD": password,
                },
            }
            if secret_hash:
                payload["AuthParameters"]["SECRET_HASH"] = secret_hash

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(auth_url, data=data, method="POST")
            req.add_header("Content-Type", "application/x-amz-json-1.1")
            req.add_header("X-Amz-Target", "AWSCognitoIdentityProviderService.InitiateAuth")

            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                auth_result = result.get("AuthenticationResult", {})
                _token_cache["token"] = auth_result.get("AccessToken", "")
                _token_cache["expires_at"] = now + auth_result.get("ExpiresIn", 3600)
                return _token_cache["token"]
        except Exception as e:
            logger.warning("user_password_auth_failed", error=str(e))

    # Fallback: try client_credentials
    cognito_domain = os.environ.get("GATEWAY_COGNITO_DOMAIN", "my-domain-uq2ys3ho")
    token_url = f"https://{cognito_domain}.auth.{region}.amazoncognito.com/oauth2/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": os.environ.get("GATEWAY_SCOPE", "gateway-quick-start-776830/genesis-gateway:invoke"),
    }

    try:
        encoded_data = urllib.parse.urlencode(data).encode("utf-8")
        req = urllib.request.Request(token_url, data=encoded_data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            _token_cache["token"] = result["access_token"]
            _token_cache["expires_at"] = now + result.get("expires_in", 3600)
            return _token_cache["token"]
    except Exception as e:
        logger.error("gateway_jwt_failed", error=str(e))
        return ""


def get_gateway_url() -> str:
    """Get the AgentCore Gateway MCP endpoint URL."""
    return os.environ.get(
        "GATEWAY_MCP_URL",
        "https://gateway-quick-start-776830-hycicfzjgi.gateway.bedrock-agentcore.ap-southeast-2.amazonaws.com/mcp"
    )


async def call_jira_tool(tool_name: str, arguments: dict) -> dict:
    """Call a Jira MCP tool through the AgentCore Gateway.

    Args:
        tool_name: MCP tool name (e.g. 'target-quick-start-0r2gmc___SearchIssues')
        arguments: Tool arguments (e.g. {'jql': 'project = PROJ'})

    Returns:
        Tool response as dict
    """
    from mcp.client.streamable_http import streamablehttp_client
    from mcp.client.session import ClientSession

    token = _get_gateway_jwt_token()
    if not token:
        return {"error": "Failed to authenticate with AgentCore Gateway"}

    headers = {"Authorization": f"Bearer {token}"}
    url = get_gateway_url()

    try:
        async with streamablehttp_client(url, headers=headers) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments=arguments)
                if result.content:
                    text = "\n".join(
                        c.text if c.type == "text" else str(c)
                        for c in result.content
                    )
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        return {"result": text}
                return {"result": "Success"}
    except Exception as e:
        logger.error("jira_mcp_call_failed", tool=tool_name, error=str(e))
        return {"error": str(e)}


# ---------- High-level Jira operations ----------

# Jira MCP tool name prefix (from gateway target config)
JIRA_PREFIX = "target-quick-start-0r2gmc___"


async def search_issues(jql: str, max_results: int = 50) -> list[dict]:
    """Search Jira issues using JQL query."""
    result = await call_jira_tool(
        f"{JIRA_PREFIX}SearchIssues",
        {"jql": jql, "maxResults": max_results}
    )
    if "error" in result:
        logger.error("jira_search_failed", jql=jql, error=result["error"])
        return []
    # Parse Jira MCP response format
    issues = result.get("issues", result.get("result", []))
    if isinstance(issues, str):
        try:
            issues = json.loads(issues)
        except json.JSONDecodeError:
            return []
    return issues if isinstance(issues, list) else []


async def get_all_boards(max_results: int = 50) -> list[dict]:
    """Get all Jira boards."""
    result = await call_jira_tool(f"{JIRA_PREFIX}GetAllBoards", {"maxResults": max_results})
    if "error" in result:
        return []
    boards = result.get("values", result.get("result", []))
    return boards if isinstance(boards, list) else []


async def create_issue(project_key: str, summary: str, issue_type: str = "Task",
                       description: str = "", priority: str = "Medium") -> dict:
    """Create a new Jira issue."""
    return await call_jira_tool(
        f"{JIRA_PREFIX}createIssue",
        {
            "projectKey": project_key,
            "summary": summary,
            "issueType": issue_type,
            "description": description,
            "priority": priority,
        }
    )


async def add_comment(issue_key: str, body: str) -> dict:
    """Add a comment to a Jira issue."""
    return await call_jira_tool(
        f"{JIRA_PREFIX}addComment",
        {"issueIdOrKey": issue_key, "body": body}
    )


async def do_transition(issue_key: str, transition_id: str) -> dict:
    """Transition a Jira issue (e.g. change status)."""
    return await call_jira_tool(
        f"{JIRA_PREFIX}DoTransition",
        {"issueIdOrKey": issue_key, "transitionId": transition_id}
    )


async def get_project_tasks(project_key: str, status_filter: str | None = None) -> list[dict]:
    """Get all tasks for a Jira project, optionally filtered by status.

    This is the main function used by the API handler to replace DynamoDB task queries.
    """
    jql_parts = [f"project = {project_key}"]
    if status_filter:
        status_map = {
            "todo": "TODO",
            "in_progress": "IN PROGRESS",
            "done": "DONE",
            "completed": "DONE",
            "overdue": "OVERDUE",
        }
        jql_parts.append(f"status = '{status_map.get(status_filter, status_filter)}'")

    jql = " AND ".join(jql_parts) + " ORDER BY updated DESC"
    return await search_issues(jql)


async def get_overdue_tasks(project_key: str | None = None) -> list[dict]:
    """Get overdue tasks across projects."""
    jql_parts = ["due < now()", "status NOT IN (DONE, CANCELLED)"]
    if project_key:
        jql_parts.append(f"project = {project_key}")

    jql = " AND ".join(jql_parts) + " ORDER BY due ASC"
    return await search_issues(jql)


def parse_jira_issue(issue: dict) -> dict:
    """Parse a Jira MCP issue response into the app's task format.

    Maps Jira fields to the DynamoDB task schema used by the frontend.
    """
    fields = issue.get("fields", issue)
    return {
        "task_id": issue.get("key", issue.get("id", "")),
        "project_id": fields.get("project", {}).get("key", ""),
        "title": fields.get("summary", ""),
        "description": fields.get("description", ""),
        "status": _map_jira_status(fields.get("status", {}).get("name", "")),
        "priority": _map_jira_priority(fields.get("priority", {}).get("name", "")),
        "assignee": {
            "user_id": fields.get("assignee", {}).get("name", "") if fields.get("assignee") else "",
            "display_name": fields.get("assignee", {}).get("displayName", "") if fields.get("assignee") else "",
        },
        "due_date": fields.get("duedate", ""),
        "is_overdue": _is_overdue(fields.get("duedate", ""), fields.get("status", {}).get("name", "")),
        "version": 1,
        "updated_at": fields.get("updated", ""),
        "allowed_actions": ["update"],
    }


def _map_jira_status(jira_status: str) -> str:
    """Map Jira status to app status."""
    status_lower = jira_status.lower()
    if "done" in status_lower or "closed" in status_lower or "resolved" in status_lower:
        return "done"
    if "progress" in status_lower or "review" in status_lower:
        return "in_progress"
    return "todo"


def _map_jira_priority(jira_priority: str) -> str:
    """Map Jira priority to app priority."""
    priority_lower = jira_priority.lower()
    if "highest" in priority_lower or "blocker" in priority_lower:
        return "critical"
    if "high" in priority_lower:
        return "high"
    if "low" in priority_lower or "lowest" in priority_lower:
        return "low"
    return "medium"


def _is_overdue(due_date: str, status: str) -> bool:
    """Check if a task is overdue."""
    if not due_date:
        return False
    if status.lower() in ("done", "closed", "resolved"):
        return False
    from datetime import datetime, timezone
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        return due < datetime.now(timezone.utc)
    except (ValueError, TypeError):
        return False
