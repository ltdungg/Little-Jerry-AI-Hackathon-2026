import time
from typing import Any

from strands import Agent, tool

from agents.common.contracts.agent import AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus
from agents.common.model.provider import get_strands_model
from agents.common.clients.mcp_client import fetch_mcp_tools_for_target


import json
import urllib.request
import urllib.parse
import boto3

def _get_slack_bot_token() -> str:
    try:
        sm = boto3.client("secretsmanager")
        secret_value = sm.get_secret_value(SecretId="npo-ai-dev-slack-admin-access-token")
        secret_string = secret_value["SecretString"]
        try:
            return json.loads(secret_string).get("slack_bot_token", "")
        except json.JSONDecodeError:
            # Fallback if secret is stored as raw string instead of JSON
            return secret_string
    except Exception as e:
        print(f"Error getting Slack token: {e}")
        return ""

def read_slack_chat(channel_id: str, limit: int = 30) -> str:
    """Đọc lịch sử tin nhắn gần nhất của một kênh (channel) Slack để tóm tắt."""
    token = _get_slack_bot_token()
    if not token:
        return "Lỗi: Không lấy được Slack token."
    
    req = urllib.request.Request(
        f"https://slack.com/api/conversations.history?channel={channel_id}&limit={limit}",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if not data.get("ok"):
                return f"Lỗi từ Slack API: {data.get('error')}"
            
            messages = data.get("messages", [])
            result = []
            # Đảo ngược lại để tin nhắn cũ nhất ở trên
            for msg in reversed(messages):
                user = msg.get("user", msg.get("bot_id", "Unknown"))
                text = msg.get("text", "")
                result.append(f"User {user}: {text}")
            return "\n".join(result) if result else "Không có tin nhắn nào."
    except Exception as e:
        return f"Lỗi khi gọi Slack API: {str(e)}"

def send_slack_message(channel_id: str, text: str) -> str:
    """Gửi một tin nhắn văn bản trực tiếp vào một kênh Slack."""
    token = _get_slack_bot_token()
    if not token:
        return "Lỗi: Không lấy được Slack token."
    
    payload = json.dumps({
        "channel": channel_id,
        "text": text
    }).encode("utf-8")
    
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8"
        }
    )
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if not data.get("ok"):
                return f"Lỗi từ Slack API: {data.get('error')}"
            return "Gửi tin nhắn thành công."
    except Exception as e:
        return f"Lỗi khi gửi Slack API: {str(e)}"

def create_communication_agent(slack_client: Any = None, mcp_tools: list = None) -> Agent:
    """Create a Strands Agent for communication using native tools."""

    tools = [tool(read_slack_chat), tool(send_slack_message)]
    model = get_strands_model()
    
    system_prompt = (
        "Bạn là trợ lý liên lạc thông minh (Vera) của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
        "Bạn được tích hợp trực tiếp trên Slack và có các công cụ để đọc và gửi tin nhắn.\n"
        "LUÔN sử dụng các công cụ được cung cấp:\n"
        "- Dùng 'read_slack_chat' nếu người dùng yêu cầu tóm tắt chat hoặc cần đọc ngữ cảnh trước đó.\n"
        "- Dùng 'send_slack_message' để phản hồi lại người dùng trực tiếp trên kênh Slack hiện tại.\n"
        "Trong ngữ cảnh (context), bạn sẽ được cung cấp event chứa 'channel' id. Hãy dùng ID đó cho tham số 'channel_id' của các công cụ.\n"
        "KHÔNG TỰ BỊA RA DỮ LIỆU. Bắt buộc phải dùng công cụ.\n"
        "LUÔN trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp, ngắn gọn, dễ hiểu.\n"
    )

    return Agent(
        name="communication",
        model=model,
        tools=tools,
        system_prompt=system_prompt,
    )


class CommunicationAgent:
    """Bridge between AgentCore contract (handle()) and Strands Agent."""

    def __init__(self, model_provider=None, slack_client: Any = None):
        self._slack_client = slack_client

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            agent = create_communication_agent(slack_client=self._slack_client)
            prompt = (
                f"Yêu cầu từ người dùng: {request.instructions}\n"
                f"Ngữ cảnh (context): {json.dumps(request.inputs, ensure_ascii=False)}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.completed,
                summary=response_text,
                facts=[Fact(key="draft", value=response_text)],
                citations=[], proposed_actions=[], artifacts=[],
                warnings=[], confidence=1.0, retryable=False,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=TaskStatus.failed,
                summary=f"Liên lạc thất bại: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[],
                warnings=[str(e)], confidence=0.0, retryable=True,
                metrics=AgentMetrics(latency_ms=latency, input_tokens=0, output_tokens=0),
            )
