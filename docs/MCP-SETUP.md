# MCP Server Setup Guide - NPO AI Platform

## Tổng Quan

MCP Server cho phép Claude Desktop kết nối trực tiếp với:
- ✅ **Slack**: Gửi tin nhắn, liệt kê channels, đọc threads
- ✅ **Jira**: Tạo/cập nhật issues, liệt kê tasks
- ✅ **Claude AI**: Integrate ngôn ngữ xử lý tự nhiên
- ✅ **OAuth**: Xác thực an toàn với Slack/Jira

## Kiến Trúc

```
┌─────────────────────────────────────────┐
│          Claude Desktop                 │
│  (with MCP Server Integration)          │
└──────────────────┬──────────────────────┘
                   │ stdio (JSON-RPC 2.0)
                   │
┌──────────────────▼──────────────────────┐
│      mcp_server_standalone.py           │
│  (MCP JSON-RPC Server)                  │
│                                         │
│  ├─ slack_send_message()                │
│  ├─ slack_list_channels()               │
│  ├─ slack_get_thread()                  │
│  ├─ jira_create_issue()                 │
│  ├─ jira_list_issues()                  │
│  ├─ jira_update_issue()                 │
│  ├─ claude_chat()                       │
│  └─ oauth_*()                           │
└──────────────────┬──────────────────────┘
                   │ HTTP/HTTPS API calls
                   │
     ┌─────────────┼─────────────┐
     │             │             │
  Slack          Jira         Claude
  API            API           API
```

## Cài Đặt

### 1. Cài Dependencies

```bash
# Từ workspace root
uv add slack-sdk jira

# Hoặc nếu dùng pip/poetry
pip install slack-sdk jira
```

### 2. Configure Environment Variables

Tạo file `.env` hoặc set trong terminal:

```bash
# Claude API
export CLAUDE_API_KEY="sk-ant-..."

# Slack
export SLACK_BOT_TOKEN="xoxb-..."        # Bot token
export SLACK_ADMIN_TOKEN="xoxp-..."      # Admin token (optional)

# Jira
export JIRA_EMAIL="user@example.com"
export JIRA_API_TOKEN="ATATT..."
export JIRA_DOMAIN="https://your-domain.atlassian.net"

# OAuth (for dynamic authentication)
export JIRA_CLIENT_ID="..."
export JIRA_CLIENT_SECRET="..."
export SLACK_CLIENT_ID="..."
export SLACK_CLIENT_SECRET="..."
```

### 3. Configure Claude Desktop

Tìm hoặc tạo `claude_desktop_config.json`:

**macOS/Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

Sao chép nội dung từ `claude_desktop_config.json` trong workspace:

```json
{
  "mcpServers": {
    "npo-ai-platform": {
      "command": "python",
      "args": ["-m", "mcp_server_standalone"],
      "env": {
        "CLAUDE_API_KEY": "sk-ant-...",
        "SLACK_BOT_TOKEN": "xoxb-...",
        "JIRA_EMAIL": "user@example.com",
        "JIRA_API_TOKEN": "ATATT...",
        "JIRA_DOMAIN": "https://your-domain.atlassian.net"
      }
    }
  }
}
```

## Chạy MCP Server

### Option 1: Qua Claude Desktop (Recommended)
1. Cập nhật `claude_desktop_config.json`
2. Restart Claude Desktop
3. Xem icon MCP ở góc phải cửa sổ Claude
4. Click để verify connection

### Option 2: Chạy Standalone (Testing)

```bash
# Chạy MCP stdio server
python mcp_server_standalone.py

# Hoặc
uv run python mcp_server_standalone.py
```

### Option 3: REST API (Legacy)

```bash
# Terminal 1: Chạy REST API
uv run uvicorn mcp_server:app --host 0.0.0.0 --port 8000

# Terminal 2: Test
curl -X POST http://localhost:8000/mcp/slack/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#general",
    "text": "Hello from NPO AI Platform!"
  }'
```

## Available Tools

### Slack Tools

#### 1. `send_slack_message`
Gửi tin nhắn đến Slack channel

**Parameters:**
- `channel` (string, required): Channel name hoặc ID (e.g., `#general`, `C123456`)
- `text` (string, required): Nội dung tin nhắn
- `thread_ts` (string, optional): Reply trong thread
- `token` (string, optional): Slack token (nếu khác default)

**Example:**
```
Claude: Gửi tin nhắn "Project update: Sprint đang tiến hành tốt" tới #engineering
MCP: Sẽ gọi send_slack_message với channel="#engineering", text="Project update..."
```

#### 2. `slack_list_channels`
Liệt kê tất cả Slack channels

**Example:**
```
Claude: Danh sách channels nào có trên Slack?
MCP: Trả về danh sách ~20 channels gần nhất
```

#### 3. `slack_get_thread`
Lấy messages từ một Slack thread

**Parameters:**
- `channel` (string, required): Channel ID
- `thread_ts` (string, required): Thread timestamp
- `token` (string, optional): Slack token

### Jira Tools

#### 1. `jira_create_issue`
Tạo issue mới trong Jira

**Parameters:**
- `project` (string, required): Project key (e.g., `PROJ`, `PLATFORM`)
- `summary` (string, required): Tiêu đề issue
- `description` (string, optional): Mô tả chi tiết
- `issue_type` (string, optional): Bug, Task, Story, Epic (default: Task)
- `token` (string, optional): Jira API token

**Example:**
```
Claude: Tạo issue "Fix login bug" trong project PLATFORM
MCP: Tạo issue PLATFORM-1234 với type Task
```

#### 2. `jira_list_issues`
Liệt kê issues trong project

**Parameters:**
- `project` (string, required): Project key
- `jql` (string, optional): Custom JQL query
- `token` (string, optional): Jira API token

**Example:**
```
Claude: Liệt kê top 10 issues trong PLATFORM project
MCP: Trả về PLATFORM-1234, PLATFORM-1235, ... (10 issues)
```

#### 3. `jira_update_issue`
Cập nhật status, assignee, v.v.

**Parameters:**
- `issue_key` (string, required): Issue key (e.g., `PLATFORM-1234`)
- `status` (string, optional): To Do, In Progress, In Review, Done
- `assignee` (string, optional): Username
- `token` (string, optional): Jira API token

**Example:**
```
Claude: Cập nhật PLATFORM-1234 status thành "In Progress"
MCP: Cập nhật issue thành công
```

### Claude Tools

#### 1. `claude_chat`
Chat với Claude AI

**Parameters:**
- `prompt` (string, required): Câu hỏi hoặc yêu cầu
- `temperature` (number, optional): 0-1 (default: 0.7)
- `max_tokens` (integer, optional): Token limit (default: 1000)

**Example:**
```
Claude: "Summarize project status"
MCP: Gọi Claude API và trả về summary
```

### OAuth Tools

#### 1. `oauth_get_login_url`
Lấy OAuth login URL để authorize

**Parameters:**
- `provider` (string, required): "slack" hoặc "jira"
- `redirect_uri` (string, optional): Redirect after login

#### 2. `oauth_exchange_code`
Exchange authorization code cho access token

**Parameters:**
- `provider` (string, required): "slack" hoặc "jira"
- `code` (string, required): Authorization code từ OAuth flow
- `redirect_uri` (string, optional): Redirect URI

**Example OAuth Flow:**
```
1. Claude: "Authorize với Slack"
2. MCP: Trả về login URL
3. User: Click link, authorize, nhận code
4. Claude: "Exchange code XYZ"
5. MCP: Lưu token, trả về success
```

## Debugging

### Check MCP Server Status

**Claude Desktop:**
1. Open Claude
2. Look for MCP icon in top-right corner
3. Click to see server status and logs

**Logs:**
```bash
# macOS/Linux
tail -f ~/.config/Claude/logs/mcp-*.log

# Windows
type %APPDATA%\Claude\logs\mcp-*.log
```

### Test Connection

```python
# test_mcp.py
import json
import subprocess

# Send JSON-RPC request
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
}

process = subprocess.Popen(
    ["python", "mcp_server_standalone.py"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = process.communicate(json.dumps(request) + "\n", timeout=5)
response = json.loads(stdout.strip())

print(f"Tools available: {len(response['result'])}")
for tool in response['result']:
    print(f"- {tool['name']}: {tool['description']}")
```

Run:
```bash
python test_mcp.py
```

## Troubleshooting

### Issue: "MCP Server not found"

**Solution:**
1. Verify Python path: `which python3` (macOS/Linux) hoặc `where python` (Windows)
2. Verify module exists: `python -m mcp_server_standalone`
3. Check environment: Có `.env` hoặc env vars không?

### Issue: "Token not configured"

**Solution:**
1. Set environment variables
2. Verify in Claude config: Tokens được pass vào `env`?
3. Test manually: `export SLACK_BOT_TOKEN=xoxb-...; python mcp_server_standalone.py`

### Issue: "Slack/Jira API error"

**Solution:**
1. Verify token độc quyền (unique per integration)
2. Check token scopes: Slack bot needs `chat:write`, Jira needs API token access
3. Check domain: Jira domain format `https://your-domain.atlassian.net`

## Production Deployment

### Option 1: AWS Lambda (Recommended)

```python
# lambdas/mcp_handler.py
import json
import subprocess

def lambda_handler(event, context):
    """Wrap MCP server for Lambda"""
    request = json.loads(event.get("body", "{}"))
    
    process = subprocess.run(
        ["python", "-m", "mcp_server_standalone"],
        input=json.dumps(request) + "\n",
        capture_output=True,
        text=True
    )
    
    response = json.loads(process.stdout)
    return {
        "statusCode": 200,
        "body": json.dumps(response)
    }
```

### Option 2: Docker

```dockerfile
# Dockerfile.mcp
FROM python:3.12-slim

WORKDIR /app
COPY . .

RUN pip install -e .

ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "mcp_server_standalone"]
```

Build & Run:
```bash
docker build -f Dockerfile.mcp -t npo-mcp-server .
docker run -e SLACK_BOT_TOKEN=xoxb-... -e JIRA_API_TOKEN=... npo-mcp-server
```

### Option 3: Systemd Service (Linux)

```ini
# /etc/systemd/system/npo-mcp.service
[Unit]
Description=NPO AI Platform MCP Server
After=network.target

[Service]
Type=simple
User=npo-ai
WorkingDirectory=/opt/npo-ai-platform
ExecStart=/usr/bin/python3 -m mcp_server_standalone
Restart=always
RestartSec=10
Environment="SLACK_BOT_TOKEN=xoxb-..."
Environment="JIRA_API_TOKEN=ATATT..."

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable npo-mcp
sudo systemctl start npo-mcp
sudo systemctl status npo-mcp
```

## API Reference

### JSON-RPC 2.0 Methods

#### `tools/list`
Lấy danh sách tất cả tools

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "name": "send_slack_message",
      "description": "Gửi tin nhắn đến Slack channel",
      "inputSchema": {...}
    }
  ]
}
```

#### `tools/call`
Gọi một tool

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "send_slack_message",
    "arguments": {
      "channel": "#general",
      "text": "Hello!"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ Tin nhắn đã được gửi đến #general"
      }
    ]
  }
}
```

## Performance & Limits

- **Concurrent calls:** Hỗ trợ multiple simultaneous requests
- **Token limit:** Claude 1M tokens/minute
- **Slack API:** 60 requests/minute (standard tier)
- **Jira API:** 300 requests/hour (standard tier)
- **Timeout:** 60 seconds per API call

## Security Best Practices

1. **Never commit tokens:**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use environment variables:**
   ```bash
   export SLACK_BOT_TOKEN=$(aws secretsmanager get-secret-value --secret-id slack-bot-token --query SecretString --output text)
   ```

3. **Rotate tokens regularly:**
   - Slack: Settings → App Management → Regenerate token
   - Jira: Settings → API Tokens → Create new

4. **Scope tokens minimally:**
   - Slack: `chat:write`, `channels:read` only
   - Jira: Read-write for needed projects only

## Support

For issues, check:
1. [MCP Spec](https://modelcontextprotocol.io/)
2. [Slack API Docs](https://api.slack.com/)
3. [Jira REST API](https://developer.atlassian.com/cloud/jira/rest/)
4. [Claude API Docs](https://docs.anthropic.com/)

---

**Last Updated:** July 2026
