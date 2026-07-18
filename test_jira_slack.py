import asyncio
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from agents.common.clients.mcp_client import fetch_mcp_tools_for_target
from agents.common.clients.jira_mcp import search_issues

async def main():
    # Sử dụng thông tin xác thực chính xác của Gateway Cognito User Pool
    os.environ["GATEWAY_USER_POOL_ID"] = "ap-southeast-2_Sxfwzr9KC"
    os.environ["GATEWAY_CLIENT_ID"] = "ee5p4kli3988i497e9fd3532k"
    os.environ["GATEWAY_CLIENT_SECRET"] = "cu9m99ism122u92d0f6oun04gfvcermhdcqpj9ke78eb0h1ds1"
    os.environ["AWS_REGION"] = "ap-southeast-2"
    
    print("\n--- KIỂM TRA JIRA MCP ---")
    jira_tools = await fetch_mcp_tools_for_target("jira")
    print(f"Số lượng Jira Tools lấy được từ Gateway: {len(jira_tools)}")
    if len(jira_tools) > 0:
        for t in jira_tools:
            name = t.spec.name if hasattr(t, "spec") else str(t)
            print(f"  + {name}")
            
        from agents.common.clients.jira_mcp import get_all_boards
        
        print("\nThử lấy danh sách các Boards...")
        boards = await get_all_boards(max_results=5)
        print(json.dumps(boards, indent=2, ensure_ascii=False))
        
        print("\nThử gọi hàm search_issues lấy các issue gần đây...")
        issues = await search_issues("order by updated DESC", max_results=2)
        print(json.dumps(issues, indent=2, ensure_ascii=False))
    
    print("\n--- KIỂM TRA SLACK MCP ---")
    slack_tools = await fetch_mcp_tools_for_target("slack")
    print(f"Số lượng Slack Tools lấy được từ Gateway: {len(slack_tools)}")
    if len(slack_tools) > 0:
        for t in slack_tools:
            name = t.spec.name if hasattr(t, "spec") else str(t)
            print(f"  + {name}")

if __name__ == "__main__":
    asyncio.run(main())
