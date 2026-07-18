import os
import time
import json
import asyncio
from typing import Annotated, TypedDict

import structlog
from langgraph.graph import StateGraph, END

from agents.common.contracts.agent import (
    AgentTaskRequest, AgentTaskResult, AgentMetrics, TaskStatus,
)
from agents.common.contracts.context import UserRole
from agents.common.model.provider import BedrockProvider
from agents.common.memory import BedrockAgentCoreMemoryStore
from agents.intent_router.agent import IntentRouter, Intent, INTENT_TO_AGENT

logger = structlog.get_logger()

def merge_list(a: list, b: list) -> list:
    return a + b

class State(TypedDict):
    user_request: str
    session_id: str
    role: str
    tenant_id: str
    project_id: str
    chat_history: str
    inputs: dict

    # Intent routing
    intent: str
    target_agent: str

    tasks: list[dict]

    evidences: Annotated[list[str], merge_list]
    missing_info: str
    retry_count: int
    final_response: str


class OrchestratorAgent:
    """LangGraph-based orchestrator with Intent Router + ReAct + Map-Reduce + Reflection pattern."""

    def __init__(self):
        self._memory_id = os.getenv("MEMORY_ID", "")
        self._provider = BedrockProvider()
        self._intent_router = IntentRouter()

    async def intent_router_node(self, state: State) -> dict:
        """Classify intent and route to appropriate agent."""
        logger.info("intent_router_node", user_request=state["user_request"][:100])

        # Create a mock request for the router
        mock_request = AgentTaskRequest(
            workflow_id="",
            task_id="",
            agent_name="orchestrator",
            intent=None,
            instructions=state["user_request"],
            inputs=state.get("inputs", {}),
            constraints=None,
        )

        intent, agent_name = await self._intent_router.route(mock_request)
        logger.info("intent_classified", intent=intent.value, target_agent=agent_name)

        return {
            "intent": intent.value,
            "target_agent": agent_name,
        }

    async def planner_node(self, state: State) -> dict:
        logger.info("planner_node", retry_count=state["retry_count"])
        
        prompt = f"""Bạn là Planner AI của tổ chức NPO. Nhiệm vụ của bạn là phân tích câu hỏi người dùng và quyết định gọi các Tool nào để lấy dữ liệu thô. KHÔNG tự bịa dữ liệu.

[THÔNG TIN NGƯỜI DÙNG]
Câu hỏi: {state['user_request']}
Vai trò: {state['role']}
Project ID: {state['project_id']}
Tenant ID: {state['tenant_id']}

[LỊCH SỬ CHAT TRƯỚC ĐÓ]
{state['chat_history']}

[THÔNG TIN THIẾU TỪ LẦN TRƯỚC]
{state.get('missing_info', '')}

[CÁC TOOL CÓ SẴN (WORKERS)]
1. source="slack":
   - action="read_slack_chat": params={{"channel_id": "{state.get('inputs', dict()).get('channel_id', 'C012345')}", "limit": Số_lượng}} - Đọc tin nhắn Slack trong channel hiện tại.
   - action="send_slack_message": params={{"channel_id": "{state.get('inputs', dict()).get('channel_id', 'C012345')}", "text": "Nội dung"}} - Gửi tin nhắn Slack.
2. source="jira":
   - action="list_project_tasks": params={{"project_key": "Mã dự án (VD: WD, WD, PROJ)", "status_filter": "todo/in_progress/done"}} - Lấy danh sách task.
   - action="list_overdue_tasks": params={{"project_key": "Mã dự án"}} - Lấy task trễ hạn.
3. source="knowledge":
   - action="search_organizational_knowledge": params={{"query": "Câu hỏi tìm kiếm"}} - Tìm tài liệu/quy trình/chính sách.
   
Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ với định dạng:
{{
  "tasks": [
    {{
      "source": "tên_nguồn",
      "action": "tên_hàm",
      "params": {{"key": "value"}}
    }}
  ]
}}
Nếu không cần tìm thêm dữ liệu (ví dụ chào hỏi), trả về tasks rỗng [].
"""
        response = await self._provider.generate(prompt=prompt, temperature=0.1)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        try:
            parsed = json.loads(text)
            tasks = parsed.get("tasks", [])
        except Exception as e:
            logger.error("planner_json_parse_error", error=str(e), text=text)
            tasks = []

        return {"tasks": tasks}

    async def execute_workers_node(self, state: State) -> dict:
        tasks_to_run = state.get("tasks", [])
        if not tasks_to_run:
            return {"evidences": []}

        # Imports for the tool functions
        from agents.communication.agent import read_slack_chat, send_slack_message
        from agents.knowledge.agent import search_organizational_knowledge, search_documents
        from agents.common.clients.jira_mcp import get_project_tasks, get_overdue_tasks, parse_jira_issue

        evidences = []

        async def run_tool(task: dict):
            source = task.get("source")
            action = task.get("action")
            params = task.get("params", {})
            
            # Inject defaults if missing
            if source == "slack" and "channel_id" not in params:
                params["channel_id"] = state.get("inputs", {}).get("channel_id", "")
            if source == "jira" and "project_key" not in params:
                params["project_key"] = state.get("project_id", "")

            logger.info("run_tool", source=source, action=action, params=params)
            try:
                res = None
                if source == "slack":
                    if action == "read_slack_chat":
                        res = await asyncio.to_thread(read_slack_chat, **params)
                    elif action == "send_slack_message":
                        res = await asyncio.to_thread(send_slack_message, **params)
                elif source == "knowledge":
                    if action == "search_organizational_knowledge":
                        res = await asyncio.to_thread(search_organizational_knowledge, **params)
                    elif action == "search_documents":
                        res = await asyncio.to_thread(search_documents, **params)
                elif source == "jira":
                    if action == "list_project_tasks":
                        raw = await get_project_tasks(**params)
                        parsed = [parse_jira_issue(i) for i in raw]
                        res = json.dumps(parsed, ensure_ascii=False, indent=2)
                    elif action == "list_overdue_tasks":
                        raw = await get_overdue_tasks(**params)
                        parsed = [parse_jira_issue(i) for i in raw]
                        res = json.dumps(parsed, ensure_ascii=False, indent=2)

                if res is not None:
                    return f"[KẾT QUẢ TỪ {source.upper()} - {action}]:\n{res}"
                else:
                    return f"[CẢNH BÁO]: Không tìm thấy action {action} cho source {source}"
            except Exception as e:
                logger.error("tool_execution_failed", source=source, action=action, error=str(e))
                return f"[LỖI TỪ {source.upper()} - {action}]: {str(e)}"

        coros = [run_tool(t) for t in tasks_to_run]
        results = await asyncio.gather(*coros)
        return {"evidences": list(results)}

    async def verifier_node(self, state: State) -> dict:
        evidences = state["evidences"]
        
        # Avoid infinite loops
        if state["retry_count"] >= 2:
            return {"missing_info": ""}
            
        if not evidences:
            return {"missing_info": ""}
            
        evidence_text = "\n\n".join(evidences)
        
        prompt = f"""Bạn là Verifier AI. Đánh giá xem dữ liệu thu thập được có đủ để trả lời câu hỏi của người dùng không.
        
[CÂU HỎI NGƯỜI DÙNG]
{state['user_request']}

[DỮ LIỆU THU THẬP ĐƯỢC CỦA CÁC WORKERS]
{evidence_text}

Hãy kiểm tra:
1. Có bị mâu thuẫn thông tin không?
2. Có thiếu dữ liệu trầm trọng để trả lời câu hỏi không?

Trả về DUY NHẤT chuỗi JSON:
{{
    "status": "OK" hoặc "MISSING",
    "missing_info": "Ghi rõ cái gì còn thiếu hoặc mâu thuẫn để Planner tìm lại. Bỏ trống nếu status là OK."
}}
"""
        response = await self._provider.generate(prompt=prompt, temperature=0.1)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        try:
            parsed = json.loads(text)
            status = parsed.get("status", "OK")
            missing_info = parsed.get("missing_info", "")
        except:
            status = "OK"
            missing_info = ""

        if status == "MISSING":
            return {"missing_info": missing_info, "retry_count": state["retry_count"] + 1}
        else:
            return {"missing_info": "", "retry_count": state["retry_count"]}

    async def synthesizer_node(self, state: State) -> dict:
        evidence_text = "\n\n".join(state["evidences"])
        
        prompt = f"""Bạn là Tổng hợp viên (Synthesizer AI). Dựa vào dữ liệu thô từ các Worker, hãy viết câu trả lời cuối cùng cho người dùng.
        
[LỊCH SỬ CHAT TRƯỚC ĐÓ]
{state['chat_history']}

[CÂU HỎI NGƯỜI DÙNG]
{state['user_request']}

[DỮ LIỆU TỪ CÁC WORKER]
{evidence_text}

LUÔN trả lời bằng tiếng Việt, thân thiện, rõ ràng, trình bày dưới dạng Markdown chuyên nghiệp. Dùng Emoji khi phù hợp.
Tổng hợp các dữ liệu một cách thông minh, giải thích nguyên nhân nếu có.
Nếu dữ liệu báo lỗi hoặc thiếu, hãy giải thích dựa trên dữ liệu hiện có.
"""
        response = await self._provider.generate(prompt=prompt, temperature=0.3)
        return {"final_response": response.text}

    def _build_graph(self):
        workflow = StateGraph(State)

        # Add nodes
        workflow.add_node("intent_router", self.intent_router_node)
        workflow.add_node("planner", self.planner_node)
        workflow.add_node("execute_workers", self.execute_workers_node)
        workflow.add_node("verifier", self.verifier_node)
        workflow.add_node("synthesizer", self.synthesizer_node)

        # Set entry point
        workflow.set_entry_point("intent_router")

        # Intent router decides: skip to synthesizer for simple intents, or go to planner
        def after_intent_router(state: State):
            intent = state.get("intent", Intent.UNKNOWN.value)
            target_agent = state.get("target_agent", "orchestrator")

            # For single-agent intents, skip planner and go directly to synthesizer
            # The evidence will be gathered by the target agent (called via MCP tools)
            if intent in (Intent.GREETING.value,):
                return "synthesizer"
            # For other intents, still go through planner for multi-tool orchestration
            return "planner"

        workflow.add_conditional_edges(
            "intent_router",
            after_intent_router,
            {"planner": "planner", "synthesizer": "synthesizer"}
        )

        workflow.add_edge("planner", "execute_workers")
        workflow.add_edge("execute_workers", "verifier")

        def should_continue(state: State):
            if state.get("missing_info") and state.get("retry_count", 0) < 2:
                return "planner"
            return "synthesizer"

        workflow.add_conditional_edges(
            "verifier",
            should_continue,
            {"planner": "planner", "synthesizer": "synthesizer"}
        )

        workflow.add_edge("synthesizer", END)
        return workflow.compile()

    async def handle(self, request: AgentTaskRequest) -> AgentTaskResult:
        start = time.time()
        try:
            # Resolve role manually
            raw_role = request.constraints.user_role if request.constraints else "volunteer"
            try:
                role = UserRole(raw_role)
            except ValueError:
                role = UserRole.volunteer
                
            session_id = request.constraints.session_id if request.constraints else ""
            tenant_id = request.constraints.tenant_id if request.constraints else "aiv"
            project_ids = request.constraints.project_ids if request.constraints else []
            project_id = project_ids[0] if project_ids else ""
            
            logger.info("orchestrator_handle", role=role.value, workflow_id=request.workflow_id, session_id=session_id)
            
            # 1. Fetch History from Memory Store
            chat_history_str = ""
            if self._memory_id and session_id:
                try:
                    store = BedrockAgentCoreMemoryStore(memory_id=self._memory_id, namespace=session_id)
                    entries = await store.search(query="") # Get latest
                    if entries:
                        # Limit to last 5 entries
                        recent = entries[:5]
                        recent.reverse()
                        chat_history_str = "\n".join([e.content for e in recent])
                except Exception as e:
                    logger.warning("memory_fetch_failed", error=str(e))
            
            # 2. Run LangGraph
            initial_state = State(
                user_request=request.instructions,
                session_id=session_id,
                role=role.value,
                tenant_id=tenant_id,
                project_id=project_id,
                chat_history=chat_history_str,
                inputs=request.inputs,
                intent="",
                target_agent="",
                tasks=[],
                evidences=[],
                missing_info="",
                retry_count=0,
                final_response=""
            )
            
            graph = self._build_graph()
            final_state = await graph.ainvoke(initial_state)
            
            response_text = final_state.get("final_response", "Đã xảy ra lỗi khi tổng hợp câu trả lời.")
            
            # 3. Save to Memory
            if self._memory_id and session_id:
                try:
                    store = BedrockAgentCoreMemoryStore(memory_id=self._memory_id, namespace=session_id)
                    await store.add_messages([
                        {"role": "user", "content": request.instructions},
                        {"role": "assistant", "content": response_text}
                    ])
                except Exception as e:
                    logger.warning("memory_save_failed", error=str(e))

            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="orchestrator",
                status=TaskStatus.completed,
                summary=response_text,
                facts=[], citations=[], proposed_actions=[], artifacts=[], warnings=[],
                confidence=0.9, retryable=False,
                metrics=AgentMetrics(
                    latency_ms=int((time.time() - start) * 1000),
                    input_tokens=0, output_tokens=0,
                ),
            )

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error("orchestrator_graph_error", error=str(e))
            return AgentTaskResult(
                workflow_id=request.workflow_id,
                task_id=request.task_id,
                agent_name="orchestrator",
                status=TaskStatus.failed,
                summary=f"Lỗi hệ thống LangGraph Orchestrator: {str(e)}",
                facts=[], citations=[], proposed_actions=[], artifacts=[], warnings=[str(e)],
                confidence=0.0, retryable=True,
                metrics=AgentMetrics(
                    latency_ms=int((time.time() - start) * 1000),
                    input_tokens=0, output_tokens=0,
                ),
            )
