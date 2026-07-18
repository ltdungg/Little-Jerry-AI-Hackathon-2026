import json
import os
import sys

# Force UTF-8 for standard output
sys.stdout.reconfigure(encoding='utf-8')

os.environ["ORCHESTRATOR_RUNTIME_ARN"] = "arn:aws:bedrock-agentcore:ap-southeast-2:314567759962:runtime/npo_ai_dev_orchestrator-B70uwa2qrl"
os.environ["REGION"] = "ap-southeast-2"
os.environ["BUSINESS_TABLE"] = "npo-ai-dev-business-data"
os.environ["WORKFLOW_TABLE"] = "npo-ai-dev-workflow-state"

sys.path.append("d:\\AI-Hackathon")

from lambdas.api.handler import handle_chat
from lambdas.common.utils import build_request_context

def ask_agent(question: str, project_id: str = None):
    print(f"\n[Người dùng]: {question}")
    
    event = {
        "requestContext": {
            "http": {
                "path": "/v1/chat",
                "method": "POST"
            }
        },
        "body": json.dumps({
            "message": question, 
            "project_id": project_id,
            "session_id": "demo-session-123-demo-session-123-abc"
        })
    }
    
    # "Đăng nhập" dưới vai trò user-minh (Project Manager)
    request_ctx = build_request_context(
        {"sub": "user-minh", "cognito:groups": "project_manager"},
        event
    )
    
    try:
        resp = handle_chat(event, request_ctx)
        if resp["statusCode"] == 200:
            body = json.loads(resp["body"])
            answer = body.get("answer", "")
            print(f"[Agent]: {answer}")
        else:
            print(f"[Lỗi]: {resp}")
    except Exception as e:
        print(f"[Exception]: {e}")
    
    print("-" * 60)

def main():
    print("=== BẮT ĐẦU TEST DEMO DỰ ÁN VÀ TASK ===")
    
    # 1. Liệt kê các dự án
    ask_agent("Hãy liệt kê các dự án hiện có mà tôi quản lý.")
    
    # 2. Xem task quá hạn
    # ask_agent("Có task nào đang bị quá hạn trong dự án của tôi không?", project_id="proj-green-hope")
    
    # 3. Đề xuất tạo task mới
    # ask_agent("Hãy tạo một task mới: 'Viết báo cáo tài chính tháng 7' và giao cho user-minh.", project_id="proj-green-hope")

if __name__ == "__main__":
    main()
