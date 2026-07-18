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
from agents.intent_router.agent import IntentRouterAgent, Intent, INTENT_TO_AGENT

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
        self._intent_router = IntentRouterAgent()

    async def intent_router_node(self, state: State) -> dict:
        """Classify intent and route to appropriate agent."""
        logger.info("intent_router_node", user_request=state["user_request"][:100])

        # Use LLM to classify intent (more accurate than keyword matching)
        from agents.intent_router.agent import llm_classify
        query = state["user_request"]
        intent = await llm_classify(query, self._provider)
        agent_name = INTENT_TO_AGENT.get(intent, "orchestrator")
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

1. source="jira" (qua MCP Gateway - dữ liệu thực từ Jira):
   - action="list_project_tasks": params={{"project_key": "Mã dự án Jira (VD: PROJ, WD)", "status_filter": "todo/in_progress/done"}} - Lấy danh sách task từ Jira.
   - action="list_overdue_tasks": params={{"project_key": "Mã dự án Jira"}} - Lấy task trễ hạn từ Jira.
   - action="search_issues": params={{"jql": "JQL query"}} - Tìm kiếm issues bằng JQL.
   - action="get_all_boards": params={{{{}}}} - Lấy danh sách tất cả boards.
   - action="any_jira_action": params={{"tool_name": "Tên MCP tool", ...params}} - Gọi bất kỳ Jira MCP tool nào.

2. source="slack" (qua Slack API - dữ liệu thực từ Slack):
   - action="read_slack_chat": params={{"channel_id": "ID kênh", "limit": 30}} - Đọc tin nhắn Slack.
   - action="send_slack_message": params={{"channel_id": "ID kênh", "text": "Nội dung"}} - Gửi tin nhắn Slack.

3. source="knowledge" (qua Bedrock Knowledge Base - tài liệu thực):
   - action="search_organizational_knowledge": params={{"query": "Câu hỏi tìm kiếm"}} - Tìm tri thức tổ chức.
   - action="search_documents": params={{"query": "Từ khóa", "top_k": 5}} - Tìm tài liệu chi tiết.

4. source="dynamodb" (dữ liệu nội bộ từ DynamoDB):
   - action="list_projects": params={{{{}}}} - Liệt kê tất cả projects.
   - action="list_tasks": params={{"project_id": "ID dự án"}} - Liệt kê tasks.

[HƯỚNG DẪN QUAN TRỌNG]
- Khi người dùng hỏi về Jira/task/project: BẮT BUỘC phải dùng source="jira" để lấy dữ liệu thật.
- Khi người dùng hỏi về tài liệu/quy trình: Dùng source="knowledge".
- Khi người dùng hỏi về Slack: Dùng source="slack".
- KHÔNG BAO GIỜ trả về tasks rỗng [] khi người dùng hỏi về dữ liệu. Luôn tạo ít nhất 1 task để lấy dữ liệu thực.

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ:
{{
  "tasks": [
    {{
      "source": "tên_nguồn",
      "action": "tên_hàm",
      "params": {{"key": "value"}}
    }}
  ]
}}
Nếu là chào hỏi đơn giản, trả về tasks rỗng [].
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
            return {"evidences": ["[HỆ THỐNG]: Không có task nào được Planner tạo ra. Không thể trả lời câu hỏi."]}

        evidences = []

        async def run_tool(task: dict):
            source = task.get("source", "").lower()
            action = task.get("action", "")
            params = dict(task.get("params", {}))

            # Inject defaults if missing
            if source == "slack" and "channel_id" not in params:
                params["channel_id"] = state.get("inputs", {}).get("channel_id", "")
            if source == "jira" and "project_key" not in params:
                params["project_key"] = state.get("project_id", "")

            logger.info("run_tool_start", source=source, action=action, params=params)

            try:
                res = None

                # ── Jira via MCP Gateway ──
                if source == "jira":
                    from agents.common.clients.jira_mcp import (
                        search_issues, get_project_tasks, get_overdue_tasks,
                        parse_jira_issue, JIRA_PREFIX,
                    )

                    if action == "list_project_tasks":
                        raw = await get_project_tasks(**params)
                        parsed = [parse_jira_issue(i) for i in raw]
                        res = json.dumps(parsed, ensure_ascii=False, indent=2)
                    elif action == "list_overdue_tasks":
                        raw = await get_overdue_tasks(**params)
                        parsed = [parse_jira_issue(i) for i in raw]
                        res = json.dumps(parsed, ensure_ascii=False, indent=2)
                    elif action == "search_issues":
                        jql = params.get("jql", "ORDER BY updated DESC")
                        raw = await search_issues(jql)
                        parsed = [parse_jira_issue(i) for i in raw]
                        res = json.dumps(parsed, ensure_ascii=False, indent=2)
                    elif action == "get_all_boards":
                        from agents.common.clients.jira_mcp import get_all_boards
                        raw = await get_all_boards()
                        res = json.dumps(raw, ensure_ascii=False, indent=2)
                    else:
                        # Generic MCP tool call
                        from agents.common.clients.jira_mcp import call_jira_tool
                        result = await call_jira_tool(f"{JIRA_PREFIX}{action}", params)
                        res = json.dumps(result, ensure_ascii=False, indent=2)

                # ── Slack ──
                elif source == "slack":
                    from agents.communication.agent import read_slack_chat, send_slack_message
                    if action == "read_slack_chat":
                        res = await asyncio.to_thread(read_slack_chat, **params)
                    elif action == "send_slack_message":
                        res = await asyncio.to_thread(send_slack_message, **params)

                # ── Knowledge Base ──
                elif source == "knowledge":
                    from agents.knowledge.agent import search_organizational_knowledge, search_documents
                    if action == "search_organizational_knowledge":
                        res = await asyncio.to_thread(search_organizational_knowledge, **params)
                    elif action == "search_documents":
                        res = await asyncio.to_thread(search_documents, **params)

                # ── DynamoDB (internal data) ──
                elif source == "dynamodb":
                    from agents.common.clients.dynamodb_client import BusinessDataClient
                    client = BusinessDataClient(tenant_id=state.get("tenant_id", "aiv"))
                    if action == "list_projects":
                        items = client.list_projects()
                        res = json.dumps(items, ensure_ascii=False, indent=2)
                    elif action == "list_tasks":
                        items = client.list_tasks(params.get("project_id", ""))
                        res = json.dumps(items, ensure_ascii=False, indent=2)

                if res is not None:
                    # Validate that we got real data, not empty/error
                    if isinstance(res, str) and len(res.strip()) > 0:
                        logger.info("run_tool_success", source=source, action=action, data_length=len(res))
                        return f"[DỮ LIỆU THỰC TỪ {source.upper()} - {action}]:\n{res}"
                    else:
                        return f"[CẢNH BÁO - {source.upper()}]: Tool trả về dữ liệu rỗng. Không thể trả lời câu hỏi này."
                else:
                    return f"[LỖI - {source.upper()}]: Action '{action}' không tồn tại cho source '{source}'."

            except Exception as e:
                logger.error("tool_execution_failed", source=source, action=action, error=str(e), exc_info=True)
                return f"[LỖI KẾT NỐI - {source.upper()}]: Không thể kết nối tới {source}. Lỗi: {str(e)}\nKHÔNG ĐƯỢC bịa đặt dữ liệu. Hãy nói rõ với người dùng rằng hệ thống không thể truy cập {source}."

        coros = [run_tool(t) for t in tasks_to_run]
        results = await asyncio.gather(*coros)
        return {"evidences": list(results)}

    async def verifier_node(self, state: State) -> dict:
        evidences = state["evidences"]

        # Avoid infinite loops
        if state["retry_count"] >= 2:
            return {"missing_info": ""}

        if not evidences:
            return {"missing_info": "Không có dữ liệu nào từ các worker. Cần gọi tool để lấy dữ liệu thực."}

        evidence_text = "\n\n".join(evidences)

        # Check for error indicators in evidence
        has_errors = any("[LỖI" in e or "[CẢNH BÁO" in e for e in evidences)
        has_real_data = any("[DỮ LIỆU THỰC TỪ" in e for e in evidences)

        prompt = f"""Bạn là Verifier AI. Đánh giá xem dữ liệu thu thập được có đủ và CHÍNH XÁC để trả lời câu hỏi không.

[CÂU HỎI NGƯỜI DÙNG]
{state['user_request']}

[DỮ LIỆU THU THẬP ĐƯỢC]
{evidence_text}

[HỆ THỐNG PHÁT HIỆN]
- Có dữ liệu thực: {"Có" if has_real_data else "KHÔNG"}
- Có lỗi: {"Có" if has_errors else "Không"}

KIỂM TRA:
1. Dữ liệu có thực sự trả về thông tin liên quan đến câu hỏi không?
2. Có bị lỗi kết nối hoặc dữ liệu rỗng không?
3. Nếu có [LỖI] hoặc [CẢNH BÁO], đây là dữ liệu không hợp lệ - cần báo MISSING.
4. Nếu dữ liệu không liên quan đến câu hỏi, báo MISSING.

Trả về DUY NHẤT chuỗi JSON:
{{
    "status": "OK" hoặc "MISSING",
    "missing_info": "Mô tả chính xác cái gì còn thiếu. Bỏ trống nếu status là OK."
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

        # Force MISSING if we have errors and no real data
        if has_errors and not has_real_data:
            status = "MISSING"
            missing_info = "Tất cả các tool đều trả về lỗi. Không có dữ liệu thực để trả lời."

        if status == "MISSING":
            return {"missing_info": missing_info, "retry_count": state["retry_count"] + 1}
        else:
            return {"missing_info": "", "retry_count": state["retry_count"]}

    async def synthesizer_node(self, state: State) -> dict:
        evidence_text = "\n\n".join(state["evidences"])

        # Check if all evidences are errors
        has_real_data = any(
            "[DỮ LIỆU THỰC TỪ" in e
            for e in state["evidences"]
        )
        has_errors = any(
            "[LỖI" in e or "[CẢNH BÁO" in e
            for e in state["evidences"]
        )

        prompt = f"""Bạn là Tổng hợp viên (Synthesizer AI). Dựa vào dữ liệu thô từ các Worker, hãy viết câu trả lời cuối cùng cho người dùng.

[LỊCH SỬ CHAT TRƯỚC ĐÓ]
{state['chat_history']}

[CÂU HỎI NGƯỜI DÙNG]
{state['user_request']}

[DỮ LIỆU TỪ CÁC WORKER]
{evidence_text}

QUY TẮC BẮT BUỘC:
1. CHỈ sử dụng dữ liệu thực tế được cung cấp ở trên. TUYỆT ĐỐI KHÔNG bịa đặt số liệu, tên project, tên task, hoặc bất kỳ thông tin nào không có trong dữ liệu.
2. Nếu dữ liệu có chứa [LỖI] hoặc [CẢNH BÁO], hãy thông báo rõ ràng cho người dùng rằng hệ thống không thể truy cập dữ liệu và gợi ý cách khắc phục.
3. Nếu dữ liệu rỗng hoặc không có thông tin phù hợp, hãy nói "Không tìm thấy dữ liệu" thay vì bịa đặt.
4. LUÔN trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.
5. Trích dẫn nguồn dữ liệu khi có thể (VD: "Theo dữ liệu từ Jira...").
"""
        response = await self._provider.generate(prompt=prompt, temperature=0.1)
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
