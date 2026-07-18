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
    
    plan: list[str]
    plan_instructions: dict[str, str]
    
    evidences: Annotated[list[str], merge_list]
    missing_info: str
    retry_count: int
    final_response: str


class OrchestratorAgent:
    """LangGraph-based orchestrator with ReAct + Map-Reduce + Reflection pattern."""

    def __init__(self):
        self._memory_id = os.getenv("MEMORY_ID", "")
        self._provider = BedrockProvider()

    async def planner_node(self, state: State) -> dict:
        logger.info("planner_node", retry_count=state["retry_count"])
        
        prompt = f"""Bạn là một Planner AI của tổ chức NPO. Nhiệm vụ của bạn là phân tích câu hỏi người dùng và quyết định cần gọi những agent nào để lấy dữ liệu.
        
[THÔNG TIN NGƯỜI DÙNG]
Câu hỏi: {state['user_request']}
Vai trò: {state['role']}

[LỊCH SỬ CHAT TRƯỚC ĐÓ (NGỮ CẢNH)]
{state['chat_history']}

[THÔNG TIN THIẾU TỪ LẦN TRƯỚC (NẾU CÓ)]
{state.get('missing_info', '')}

[DANH SÁCH CÁC AGENT CÓ SẴN]
1. project_task: Quản lý task Jira.
2. knowledge: Tìm kiếm kiến thức, tài liệu tổ chức.
3. reporting: Thống kê, báo cáo ngân sách, tiến độ.
4. communication: Tương tác Slack, tạo draft email.
5. risk_analysis: Phân tích rủi ro, cảnh báo.

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không chứa text nào khác, không dùng markdown bọc) với định dạng:
{{
  "plan": ["tên_agent_1", "tên_agent_2"],
  "plan_instructions": {{
    "tên_agent_1": "chỉ thị cụ thể cho agent 1 (phải chứa ngữ cảnh để agent tự chạy được)",
    "tên_agent_2": "chỉ thị cụ thể cho agent 2"
  }}
}}
Nếu không cần gọi agent nào, hãy để plan là mảng rỗng [] và tự trả lời nếu câu hỏi chỉ là chào hỏi thông thường (khi đó để "direct_response" trong plan_instructions).
"""
        response = await self._provider.generate(prompt=prompt, temperature=0.1)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        try:
            parsed = json.loads(text)
            plan = parsed.get("plan", [])
            plan_instructions = parsed.get("plan_instructions", {})
        except Exception as e:
            logger.error("planner_json_parse_error", error=str(e), text=text)
            plan = []
            plan_instructions = {}

        return {"plan": plan, "plan_instructions": plan_instructions}

    async def execute_workers_node(self, state: State) -> dict:
        plan = state["plan"]
        plan_instructions = state["plan_instructions"]
        
        if not plan:
            if "direct_response" in plan_instructions:
                return {"evidences": [plan_instructions["direct_response"]]}
            return {"evidences": []}

        # Dynamically import and run specialized agents
        from agents.project_task.agent import create_project_task_agent
        from agents.knowledge.agent import create_knowledge_agent
        from agents.reporting.agent import create_reporting_agent
        from agents.communication.agent import create_communication_agent
        from agents.risk_analysis.agent import create_risk_analysis_agent

        tenant_id = state["tenant_id"]
        project_id = state["project_id"]
        
        tasks = []
        async def run_sub_agent(agent_name: str, instruction: str) -> str:
            logger.info("run_sub_agent_start", agent=agent_name)
            try:
                if agent_name == "project_task":
                    agent = create_project_task_agent(tenant_id=tenant_id, project_id=project_id)
                elif agent_name == "knowledge":
                    agent = create_knowledge_agent()
                elif agent_name == "reporting":
                    agent = create_reporting_agent(tenant_id=tenant_id)
                elif agent_name == "communication":
                    agent = create_communication_agent()
                elif agent_name == "risk_analysis":
                    agent = create_risk_analysis_agent(tenant_id=tenant_id)
                else:
                    return f"[LỖI] Agent {agent_name} không tồn tại."
                enhanced_instruction = f"""[LỊCH SỬ CHAT TRƯỚC ĐÓ]
{state['chat_history']}

[CÂU HỎI GỐC CỦA NGƯỜI DÙNG]
{state['user_request']}

[YÊU CẦU TỪ ORCHESTRATOR DÀNH CHO BẠN]
{instruction}
"""
                res = await agent.invoke_async(enhanced_instruction)
                return f"[KẾT QUẢ TỪ {agent_name.upper()}]:\n{str(res)}"
            except Exception as e:
                logger.error("sub_agent_error", agent=agent_name, error=str(e))
                return f"[LỖI TỪ {agent_name.upper()}]: {str(e)}"

        for agent_name in plan:
            if agent_name in plan_instructions:
                tasks.append(run_sub_agent(agent_name, plan_instructions[agent_name]))

        results = await asyncio.gather(*tasks)
        return {"evidences": list(results)}

    async def verifier_node(self, state: State) -> dict:
        evidences = state["evidences"]
        
        # Avoid infinite loops
        if state["retry_count"] >= 2:
            return {"missing_info": ""} # Force OK path
            
        evidence_text = "\n\n".join(evidences)
        
        prompt = f"""Bạn là Verifier AI. Đánh giá xem dữ liệu thu thập được có đủ để trả lời câu hỏi của người dùng không.
        
[CÂU HỎI NGƯỜI DÙNG]
{state['user_request']}

[DỮ LIỆU THU THẬP ĐƯỢC CỦA CÁC WORKERS]
{evidence_text}

Hãy kiểm tra:
1. Có bị mâu thuẫn thông tin không? (ví dụ Jira nói A, Slack nói B)
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
        
        prompt = f"""Bạn là Tổng hợp viên (Synthesizer AI). Dựa vào dữ liệu từ các Worker, hãy viết câu trả lời cuối cùng cho người dùng.
        
[LỊCH SỬ CHAT TRƯỚC ĐÓ]
{state['chat_history']}

[CÂU HỎI NGƯỜI DÙNG]
{state['user_request']}

[DỮ LIỆU TỪ CÁC WORKER]
{evidence_text}

LUÔN trả lời bằng tiếng Việt, thân thiện, rõ ràng, trình bày dưới dạng Markdown chuyên nghiệp. Dùng Emoji khi phù hợp.
Nếu dữ liệu báo lỗi hoặc không tìm thấy, hãy thành thật giải thích.
"""
        response = await self._provider.generate(prompt=prompt, temperature=0.3)
        return {"final_response": response.text}

    def _build_graph(self):
        workflow = StateGraph(State)

        workflow.add_node("planner", self.planner_node)
        workflow.add_node("execute_workers", self.execute_workers_node)
        workflow.add_node("verifier", self.verifier_node)
        workflow.add_node("synthesizer", self.synthesizer_node)

        workflow.set_entry_point("planner")

        workflow.add_edge("planner", "execute_workers")
        workflow.add_edge("execute_workers", "verifier")

        def should_continue(state: State):
            if state["missing_info"] and state["retry_count"] < 2:
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
                plan=[],
                plan_instructions={},
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
