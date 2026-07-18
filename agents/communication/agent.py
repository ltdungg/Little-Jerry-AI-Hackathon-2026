import json
import time
import uuid
from typing import Any

from strands import Agent, tool

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, Fact, TaskStatus, ProposedAction,
)
from agents.common.model.provider import get_strands_model


def create_communication_agent(slack_client: Any = None) -> Agent:

    @tool
    def draft_slack_message(channel: str, topic: str, context: str = "", tone: str = "professional") -> str:
        """Soạn tin nhắn Slack cho kênh được chỉ định. Trả về bản nháp đã được định dạng.
        channel: tên kênh Slack (VD: #general, #project-updates)
        topic: chủ đề chính của tin nhắn
        context: ngữ cảnh bổ sung (từ task, báo cáo, rủi ro...)
        tone: professional, friendly, urgent"""
        return json.dumps({
            "action": "draft_slack",
            "channel": channel,
            "topic": topic,
            "context": context,
            "tone": tone,
            "message": (
                f"📢 **{topic}**\n\n"
                f"{context}\n\n"
                f"Vui lòng xem chi tiết và phản hồi nếu cần.\n"
                f"Trân trọng."
            ),
        }, ensure_ascii=False)

    @tool
    def draft_email(to: str, subject: str, body: str, tone: str = "professional") -> str:
        """Soạn email gửi đến địa chỉ được chỉ định. Trả về bản nháp.
        to: địa chỉ email người nhận
        subject: tiêu đề email
        body: nội dung chính
        tone: professional, friendly, formal"""
        return json.dumps({
            "action": "draft_email",
            "to": to,
            "subject": subject,
            "tone": tone,
            "message": (
                f"Kính gửi {to},\n\n"
                f"{body}\n\n"
                f"Trân trọng,\n"
                f"Đội ngũ NPO"
            ),
        }, ensure_ascii=False)

    @tool
    def draft_meeting_summary(attendees: str, decisions: str, action_items: str) -> str:
        """Tạo bản tóm tắt cuộc họp từ danh sách người tham gia, quyết định và action items.
        Trả về bản tóm tắt có cấu trúc."""
        return json.dumps({
            "action": "draft_meeting_summary",
            "attendees": attendees,
            "message": (
                f"# Tóm tắt cuộc họp\n\n"
                f"**Người tham gia:** {attendees}\n\n"
                f"## Quyết định\n{decisions}\n\n"
                f"## Action Items\n{action_items}\n\n"
                f"---\n*Bản tóm tắt được tạo tự động bởi AI*"
            ),
        }, ensure_ascii=False)

    @tool
    def send_message(channel: str, message: str) -> str:
        """Gửi tin nhắn đến kênh được chỉ định. CẦN XÁC NHẬN trước khi gửi thực tế.
        Luôn trả về proposed action để user xác nhận."""
        confirmation_token = f"comm-tok-{uuid.uuid4().hex[:12]}"
        return json.dumps({
            "action": "send_message",
            "channel": channel,
            "message": message,
            "confirmation_token": confirmation_token,
            "preview": f"📨 Tin nhắn sẽ gửi đến {channel}:\n\n{message}",
            "message_text": f"Cần xác nhận gửi tin nhắn đến {channel}.",
        }, ensure_ascii=False)

    model = get_strands_model()
    return Agent(
        name="communication",
        model=model,
        tools=[draft_slack_message, draft_email, draft_meeting_summary, send_message],
        system_prompt=(
            "Bạn là trợ lý liên lạc của một tổ chức phi lợi nhuận (NPO) tại Việt Nam.\n"
            "LUÔN trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp.\n\n"
            "KHẢ NĂNG:\n"
            "- Soạn tin nhắn Slack (draft_slack_message)\n"
            "- Soạn email (draft_email)\n"
            "- Tạo tóm tắt cuộc họp (draft_meeting_summary)\n"
            "- Gửi tin nhắn (send_message — cần xác nhận)\n\n"
            "ĐỊNH DẠNG TIN NHẮN:\n"
            "- Mở đầu: kính gửi / thân mến tùy đối tượng\n"
            "- Nội dung: ngắn gọn, rõ ràng, đúng trọng tâm\n"
            "- Kết thúc: trân trọng / thân ái\n\n"
            "QUY TẮC:\n"
            "- Khi gửi thông báo: LUÔN dùng send_message để tạo proposed action xác nhận\n"
            "- Giọng điệu: thân thiện nhưng chuyên nghiệp, phù hợp NPO\n"
            "- Tùy chỉnh nội dung theo kênh (Slack = ngắn gọn, email = chi tiết hơn)\n"
            "- Nếu người dùng cung cấp ngữ cảnh (task, rủi ro, báo cáo), tích hợp vào nội dung"
        ),
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
                f"Ngữ cảnh: {json.dumps(request.inputs, ensure_ascii=False) if request.inputs else 'Không có'}"
            )
            result = await agent.invoke_async(prompt)
            response_text = str(result)

            proposed_action = None
            try:
                parsed = json.loads(response_text)
                if parsed.get("action") == "send_message":
                    proposed_action = ProposedAction(
                        action_id=f"act-{uuid.uuid4().hex[:12]}",
                        action_type="send_slack_message",
                        parameters={
                            "channel": parsed.get("channel"),
                            "message": parsed.get("message"),
                        },
                        preview={"message": parsed.get("preview", "")},
                        confirmation_token=parsed.get("confirmation_token"),
                    )
            except (json.JSONDecodeError, TypeError):
                pass

            status = TaskStatus.waiting_for_user if proposed_action else TaskStatus.completed

            latency = int((time.time() - start) * 1000)
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="communication-agent",
                status=status,
                summary="Đã tạo bản nháp nội dung liên lạc." if not proposed_action else "Đã tạo tin nhắn, cần xác nhận gửi.",
                facts=[Fact(key="draft", value=response_text)],
                citations=[],
                proposed_actions=[proposed_action] if proposed_action else [],
                artifacts=[],
                warnings=[],
                confidence=1.0, retryable=False,
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
