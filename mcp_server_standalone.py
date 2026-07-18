#!/usr/bin/env python3
"""
MCP Server for NPO AI Platform
Integrates Claude AI, Slack, and Jira with Model Context Protocol
"""

import asyncio
import json
import os
from typing import Any, Dict, Optional
import urllib.parse
import uuid

import aiohttp

# Tạm thời mock MCP types nếu chưa cài
class TextContent:
    def __init__(self, type: str, text: str):
        self.type = type
        self.text = text

class Tool:
    def __init__(self, name: str, description: str, inputSchema: dict):
        self.name = name
        self.description = description
        self.inputSchema = inputSchema

class JSONRPCServer:
    """JSON-RPC 2.0 Server cho MCP"""
    def __init__(self, name: str):
        self.name = name
        self.request_id = 0
        self.tools = {}
        self.handlers = {}
    
    def register_tool(self, name: str, handler, description: str, input_schema: dict):
        """Đăng ký tool"""
        self.tools[name] = {
            "name": name,
            "description": description,
            "inputSchema": input_schema,
            "handler": handler
        }
    
    async def handle_request(self, request: dict) -> dict:
        """Xử lý JSON-RPC request"""
        method = request.get("method")
        params = request.get("params", {})
        req_id = request.get("id")
        
        try:
            if method == "tools/list":
                result = self.list_tools()
            elif method == "tools/call":
                result = await self.call_tool(
                    params.get("name"),
                    params.get("arguments", {})
                )
            elif method == "resources/list":
                result = {"resources": []}
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"}
                }
            
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": result
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32603, "message": str(e)}
            }
    
    def list_tools(self) -> list:
        """Trả về danh sách tools"""
        return [
            {
                "name": tool["name"],
                "description": tool["description"],
                "inputSchema": tool["inputSchema"]
            }
            for tool in self.tools.values()
        ]
    
    async def call_tool(self, name: str, arguments: dict) -> dict:
        """Gọi tool"""
        if name not in self.tools:
            raise ValueError(f"Unknown tool: {name}")
        
        handler = self.tools[name]["handler"]
        result = await handler(**arguments) if asyncio.iscoroutinefunction(handler) else handler(**arguments)
        return {"content": [{"type": "text", "text": result}]}


# ==================== Configuration ====================
CLAUDE_API_URL = os.getenv("CLAUDE_API_URL", "https://api.anthropic.com/v1/messages")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
CLAUDE_DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
CLAUDE_SYSTEM_PROMPT = os.getenv(
    "CLAUDE_SYSTEM_PROMPT",
    "Bạn là trợ lý AI của một tổ chức phi lợi nhuận tại Việt Nam. Luôn trả lời bằng tiếng Việt, rõ ràng, ngắn gọn và chuyên nghiệp."
)

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_ADMIN_TOKEN = os.getenv("SLACK_ADMIN_TOKEN", "")

JIRA_DOMAIN = os.getenv("JIRA_DOMAIN", "https://your-domain.atlassian.net")
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")

# ==================== OAuth Configs ====================
OAUTH_CONFIGS = {
    "jira": {
        "client_id": os.getenv("JIRA_CLIENT_ID", ""),
        "client_secret": os.getenv("JIRA_CLIENT_SECRET", ""),
        "authorize_url": "https://auth.atlassian.com/authorize",
        "token_url": "https://auth.atlassian.com/oauth/token",
        "scopes": ["offline_access", "read:jira-work", "write:jira-work"],
        "audience": "api.atlassian.com",
    },
    "slack": {
        "client_id": os.getenv("SLACK_CLIENT_ID", ""),
        "client_secret": os.getenv("SLACK_CLIENT_SECRET", ""),
        "authorize_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "scopes": ["chat:write", "channels:read", "groups:read", "users:read"],
        "audience": "",
    },
}

# ==================== Token Storage ====================
# Trong production, lưu vào DynamoDB
oauth_tokens = {}


# ==================== Helper Functions ====================
async def get_slack_token(user_token: Optional[str] = None) -> str:
    """Lấy Slack token"""
    token = user_token or SLACK_BOT_TOKEN or SLACK_ADMIN_TOKEN
    if not token:
        raise ValueError("Slack token not configured")
    return token


async def get_jira_auth_header(user_token: Optional[str] = None) -> Dict[str, str]:
    """Lấy Jira authorization header"""
    token = user_token or JIRA_API_TOKEN
    if not token or not JIRA_EMAIL:
        raise ValueError("Jira credentials not configured")
    
    import base64
    credentials = base64.b64encode(f"{JIRA_EMAIL}:{token}".encode()).decode()
    return {"Authorization": f"Basic {credentials}"}


# ==================== Slack Tools ====================
async def slack_send_message(
    channel: str,
    text: str,
    thread_ts: Optional[str] = None,
    token: Optional[str] = None
) -> str:
    """Gửi tin nhắn đến Slack channel"""
    try:
        slack_token = await get_slack_token(token)
        
        payload = {
            "channel": channel,
            "text": text,
        }
        if thread_ts:
            payload["thread_ts"] = thread_ts
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://slack.com/api/chat.postMessage",
                json=payload,
                headers={"Authorization": f"Bearer {slack_token}"},
                timeout=30,
            ) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    return f"❌ Slack error: {data.get('error', 'Unknown error')}"
                
                ts = data.get("ts", "")
                return f"✅ Tin nhắn đã được gửi đến #{channel} (ts: {ts})"
    except Exception as e:
        return f"❌ Error: {str(e)}"


async def slack_list_channels(token: Optional[str] = None) -> str:
    """Liệt kê Slack channels"""
    try:
        slack_token = await get_slack_token(token)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://slack.com/api/conversations.list",
                headers={"Authorization": f"Bearer {slack_token}"},
                params={"types": "public_channel,private_channel"},
                timeout=30,
            ) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    return f"❌ Error: {data.get('error')}"
                
                channels = data.get("channels", [])
                channel_list = "\n".join([
                    f"- #{ch['name']} (ID: {ch['id']})"
                    for ch in channels[:20]
                ])
                return f"📋 Danh sách channels:\n{channel_list}"
    except Exception as e:
        return f"❌ Error: {str(e)}"


async def slack_get_thread(
    channel: str,
    thread_ts: str,
    token: Optional[str] = None
) -> str:
    """Lấy thread từ Slack"""
    try:
        slack_token = await get_slack_token(token)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://slack.com/api/conversations.replies",
                headers={"Authorization": f"Bearer {slack_token}"},
                params={"channel": channel, "ts": thread_ts},
                timeout=30,
            ) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    return f"❌ Error: {data.get('error')}"
                
                messages = data.get("messages", [])
                thread_text = "\n".join([
                    f"- {msg.get('user', 'Unknown')}: {msg.get('text', '')}"
                    for msg in messages
                ])
                return f"💬 Thread messages:\n{thread_text}"
    except Exception as e:
        return f"❌ Error: {str(e)}"


# ==================== Jira Tools ====================
async def jira_create_issue(
    project: str,
    summary: str,
    description: str = "",
    issue_type: str = "Task",
    token: Optional[str] = None
) -> str:
    """Tạo Jira issue mới"""
    try:
        auth_header = await get_jira_auth_header(token)
        
        payload = {
            "fields": {
                "project": {"key": project},
                "summary": summary,
                "description": description or summary,
                "issuetype": {"name": issue_type}
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{JIRA_DOMAIN}/rest/api/3/issue",
                json=payload,
                headers={**auth_header, "Content-Type": "application/json"},
                timeout=30,
            ) as resp:
                if resp.status not in [200, 201]:
                    error_text = await resp.text()
                    return f"❌ Jira error: {error_text}"
                
                data = await resp.json()
                issue_key = data.get("key", "")
                return f"✅ Tạo issue thành công: {issue_key}\n📌 {summary}"
    except Exception as e:
        return f"❌ Error: {str(e)}"


async def jira_list_issues(
    project: str,
    jql: Optional[str] = None,
    token: Optional[str] = None
) -> str:
    """Liệt kê Jira issues"""
    try:
        auth_header = await get_jira_auth_header(token)
        
        query = jql or f"project = {project} ORDER BY created DESC"
        params = {"jql": query, "maxResults": 10}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{JIRA_DOMAIN}/rest/api/3/search",
                headers=auth_header,
                params=params,
                timeout=30,
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    return f"❌ Jira error: {error_text}"
                
                data = await resp.json()
                issues = data.get("issues", [])
                issue_list = "\n".join([
                    f"- {issue['key']}: {issue['fields']['summary']}"
                    for issue in issues
                ])
                return f"📋 Issues in {project}:\n{issue_list}"
    except Exception as e:
        return f"❌ Error: {str(e)}"


async def jira_update_issue(
    issue_key: str,
    status: Optional[str] = None,
    assignee: Optional[str] = None,
    token: Optional[str] = None
) -> str:
    """Cập nhật Jira issue"""
    try:
        auth_header = await get_jira_auth_header(token)
        
        payload = {"fields": {}}
        if status:
            payload["fields"]["status"] = {"name": status}
        if assignee:
            payload["fields"]["assignee"] = {"name": assignee}
        
        async with aiohttp.ClientSession() as session:
            async with session.put(
                f"{JIRA_DOMAIN}/rest/api/3/issue/{issue_key}",
                json=payload,
                headers={**auth_header, "Content-Type": "application/json"},
                timeout=30,
            ) as resp:
                if resp.status not in [200, 204]:
                    error_text = await resp.text()
                    return f"❌ Jira error: {error_text}"
                
                return f"✅ Cập nhật {issue_key} thành công"
    except Exception as e:
        return f"❌ Error: {str(e)}"


# ==================== Claude Tools ====================
async def claude_chat(
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> str:
    """Chat với Claude AI"""
    try:
        if not CLAUDE_API_KEY:
            return "❌ Claude API key not configured"
        
        payload = {
            "model": CLAUDE_DEFAULT_MODEL,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": CLAUDE_SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                CLAUDE_API_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "x-api-key": CLAUDE_API_KEY,
                },
                timeout=60,
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    return f"❌ Claude error (status {resp.status}): {error_text}"
                
                data = await resp.json()
                response = data.get("content", [{}])[0].get("text", "")
                return response if response else "❌ Empty response from Claude"
    except Exception as e:
        return f"❌ Error: {str(e)}"


# ==================== OAuth Tools ====================
async def oauth_get_login_url(
    provider: str,
    redirect_uri: Optional[str] = None
) -> str:
    """Lấy OAuth login URL"""
    try:
        config = OAUTH_CONFIGS.get(provider)
        if not config:
            return f"❌ Provider {provider} not supported"
        
        if not config.get("client_id"):
            return f"❌ OAuth {provider} not configured"
        
        redirect_uri = redirect_uri or f"http://localhost:8000/mcp/oauth/{provider}/callback"
        state = str(uuid.uuid4())
        
        params = {
            "client_id": config["client_id"],
            "scope": " ".join(config["scopes"]),
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code",
        }
        if provider == "jira":
            params["audience"] = config.get("audience", "")
            params["prompt"] = "consent"
        
        # Remove empty values
        params = {k: v for k, v in params.items() if v}
        
        authorize_url = f"{config['authorize_url']}?{urllib.parse.urlencode(params)}"
        return f"🔗 Login URL:\n{authorize_url}\n\nState: {state}"
    except Exception as e:
        return f"❌ Error: {str(e)}"


async def oauth_exchange_code(
    provider: str,
    code: str,
    redirect_uri: Optional[str] = None
) -> str:
    """Exchange OAuth code for token"""
    try:
        config = OAUTH_CONFIGS.get(provider)
        if not config:
            return f"❌ Provider {provider} not supported"
        
        redirect_uri = redirect_uri or f"http://localhost:8000/mcp/oauth/{provider}/callback"
        
        token_payload = {
            "grant_type": "authorization_code",
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config["token_url"],
                data=token_payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30,
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    return f"❌ OAuth error: {error_text}"
                
                data = await resp.json()
                
                # Store token
                oauth_tokens[provider] = data
                
                access_token = data.get("access_token", "")
                expires_in = data.get("expires_in", 0)
                
                return f"✅ OAuth token obtained\n- Expires in: {expires_in} seconds\n- Token: {access_token[:20]}..."
    except Exception as e:
        return f"❌ Error: {str(e)}"


# ==================== Initialize MCP Server ====================
server = JSONRPCServer("npo-mcp-server")

# Register Slack tools
server.register_tool(
    "send_slack_message",
    slack_send_message,
    "Gửi tin nhắn đến Slack channel",
    {
        "type": "object",
        "properties": {
            "channel": {"type": "string", "description": "Tên channel hoặc ID (vd: #general hoặc C123456)"},
            "text": {"type": "string", "description": "Nội dung tin nhắn"},
            "thread_ts": {"type": "string", "description": "Thread timestamp (optional)"},
            "token": {"type": "string", "description": "Slack bot token (optional)"}
        },
        "required": ["channel", "text"]
    }
)

server.register_tool(
    "slack_list_channels",
    slack_list_channels,
    "Liệt kê tất cả Slack channels",
    {
        "type": "object",
        "properties": {
            "token": {"type": "string", "description": "Slack bot token (optional)"}
        }
    }
)

server.register_tool(
    "slack_get_thread",
    slack_get_thread,
    "Lấy thread từ Slack channel",
    {
        "type": "object",
        "properties": {
            "channel": {"type": "string", "description": "Channel ID"},
            "thread_ts": {"type": "string", "description": "Thread timestamp"},
            "token": {"type": "string", "description": "Slack bot token (optional)"}
        },
        "required": ["channel", "thread_ts"]
    }
)

# Register Jira tools
server.register_tool(
    "jira_create_issue",
    jira_create_issue,
    "Tạo Jira issue mới",
    {
        "type": "object",
        "properties": {
            "project": {"type": "string", "description": "Project key (vd: PROJ, PLAT)"},
            "summary": {"type": "string", "description": "Tiêu đề issue"},
            "description": {"type": "string", "description": "Mô tả chi tiết (optional)"},
            "issue_type": {"type": "string", "description": "Loại issue", "default": "Task", "enum": ["Task", "Bug", "Story", "Epic"]},
            "token": {"type": "string", "description": "Jira API token (optional)"}
        },
        "required": ["project", "summary"]
    }
)

server.register_tool(
    "jira_list_issues",
    jira_list_issues,
    "Liệt kê Jira issues trong project",
    {
        "type": "object",
        "properties": {
            "project": {"type": "string", "description": "Project key"},
            "jql": {"type": "string", "description": "JQL query (optional)"},
            "token": {"type": "string", "description": "Jira API token (optional)"}
        },
        "required": ["project"]
    }
)

server.register_tool(
    "jira_update_issue",
    jira_update_issue,
    "Cập nhật Jira issue",
    {
        "type": "object",
        "properties": {
            "issue_key": {"type": "string", "description": "Issue key (vd: PROJ-123)"},
            "status": {"type": "string", "description": "Status mới (optional)", "enum": ["To Do", "In Progress", "In Review", "Done"]},
            "assignee": {"type": "string", "description": "Người assignee (username)"},
            "token": {"type": "string", "description": "Jira API token (optional)"}
        },
        "required": ["issue_key"]
    }
)

# Register Claude tools
server.register_tool(
    "claude_chat",
    claude_chat,
    "Chat với Claude AI",
    {
        "type": "object",
        "properties": {
            "prompt": {"type": "string", "description": "Câu hỏi hoặc yêu cầu"},
            "temperature": {"type": "number", "description": "Độ sáng tạo (0-1)", "default": 0.7, "minimum": 0, "maximum": 1},
            "max_tokens": {"type": "integer", "description": "Số token tối đa", "default": 1000}
        },
        "required": ["prompt"]
    }
)

# Register OAuth tools
server.register_tool(
    "oauth_get_login_url",
    oauth_get_login_url,
    "Lấy OAuth login URL",
    {
        "type": "object",
        "properties": {
            "provider": {"type": "string", "description": "OAuth provider", "enum": ["slack", "jira"]},
            "redirect_uri": {"type": "string", "description": "Redirect URI (optional)"}
        },
        "required": ["provider"]
    }
)

server.register_tool(
    "oauth_exchange_code",
    oauth_exchange_code,
    "Exchange OAuth code for token",
    {
        "type": "object",
        "properties": {
            "provider": {"type": "string", "description": "OAuth provider", "enum": ["slack", "jira"]},
            "code": {"type": "string", "description": "Authorization code"},
            "redirect_uri": {"type": "string", "description": "Redirect URI (optional)"}
        },
        "required": ["provider", "code"]
    }
)


# ==================== Main ====================
async def handle_stdin():
    """Đọc JSON-RPC requests từ stdin"""
    loop = asyncio.get_event_loop()
    
    def read_line():
        """Read line from stdin in a non-blocking way"""
        import sys
        try:
            return sys.stdin.readline()
        except:
            return ""
    
    while True:
        line = await loop.run_in_executor(None, read_line)
        if not line:
            await asyncio.sleep(0.1)
            continue
        
        line = line.strip()
        if not line:
            continue
        
        try:
            request = json.loads(line)
            response = await server.handle_request(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError:
            print(json.dumps({
                "jsonrpc": "2.0",
                "error": {"code": -32700, "message": "Parse error"}
            }), flush=True)
        except Exception as e:
            print(json.dumps({
                "jsonrpc": "2.0",
                "error": {"code": -32603, "message": str(e)}
            }), flush=True)


async def main():
    """Main entry point"""
    print(f"🚀 MCP Server started: {server.name}", flush=True)
    print(f"📋 Available tools: {len(server.tools)}", flush=True)
    
    try:
        await handle_stdin()
    except KeyboardInterrupt:
        print("\n👋 MCP Server stopped", flush=True)
    except Exception as e:
        print(f"❌ Error: {e}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
