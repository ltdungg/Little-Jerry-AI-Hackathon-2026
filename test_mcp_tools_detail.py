"""Test chi tiết: liệt kê tên tools và gọi thử 1 tool lấy dữ liệu."""
import asyncio
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

os.environ["GATEWAY_USER_POOL_ID"] = "ap-southeast-2_Sxfwzr9KC"
os.environ["GATEWAY_CLIENT_ID"] = "ee5p4kli3988i497e9fd3532k"
os.environ["GATEWAY_CLIENT_SECRET"] = "cu9m99ism122u92d0f6oun04gfvcermhdcqpj9ke78eb0h1ds1"
os.environ["AWS_REGION"] = "ap-southeast-2"

from mcp.client.streamable_http import streamablehttp_client
from mcp.client.session import ClientSession
from agents.common.clients.jira_mcp import _get_gateway_jwt_token, get_gateway_url


async def main():
    token = _get_gateway_jwt_token()
    if not token:
        print("ERROR: Không lấy được JWT token!")
        return

    url = get_gateway_url()
    headers = {"Authorization": f"Bearer {token}"}

    async with streamablehttp_client(url, headers=headers) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            # 1. Liệt kê TẤT CẢ tools
            response = await session.list_tools()
            print(f"\n=== TỔNG SỐ TOOLS: {len(response.tools)} ===\n")

            jira_tools = []
            slack_tools = []
            other_tools = []

            for tool in response.tools:
                name = tool.name
                desc = tool.description[:80] if tool.description else "(no desc)"
                if "jira" in name.lower() or "jira" in (tool.description or "").lower():
                    jira_tools.append((name, desc))
                elif "slack" in name.lower() or "slack" in (tool.description or "").lower():
                    slack_tools.append((name, desc))
                else:
                    other_tools.append((name, desc))

            print(f"--- JIRA TOOLS ({len(jira_tools)}) ---")
            for name, desc in jira_tools:
                print(f"  {name}")
                print(f"    -> {desc}")

            print(f"\n--- SLACK TOOLS ({len(slack_tools)}) ---")
            for name, desc in slack_tools:
                print(f"  {name}")
                print(f"    -> {desc}")

            if other_tools:
                print(f"\n--- OTHER TOOLS ({len(other_tools)}) ---")
                for name, desc in other_tools:
                    print(f"  {name}")
                    print(f"    -> {desc}")

            # 2. Gọi tool Jira đầu tiên để test lấy dữ liệu
            if jira_tools:
                tool_name = jira_tools[0][0]
                print(f"\n=== THỬ GỌI JIRA TOOL: {tool_name} ===")
                # Thử search với JQL đơn giản
                try:
                    # Tìm tool schema để biết params
                    for tool in response.tools:
                        if tool.name == tool_name:
                            print(f"Schema: {json.dumps(tool.inputSchema, indent=2)}")
                            break

                    result = await session.call_tool(tool_name, arguments={"jql": "order by created DESC", "maxResults": 2})
                    if result.content:
                        text = "\n".join(c.text if c.type == "text" else str(c) for c in result.content)
                        # Parse JSON
                        try:
                            data = json.loads(text)
                            print(f"\nKết quả (JSON): {json.dumps(data, indent=2, ensure_ascii=False)[:2000]}")
                        except json.JSONDecodeError:
                            print(f"\nKết quả (text): {text[:2000]}")
                    else:
                        print("Không có nội dung trả về")
                except Exception as e:
                    print(f"Lỗi khi gọi tool: {e}")

            # 3. Gọi Slack tool nếu có
            if slack_tools:
                # Tìm tool list channels hoặc类似
                slack_tool_name = None
                slack_tool_schema = None
                for tool in response.tools:
                    tname = tool.name.lower()
                    if "list" in tname and "channel" in tname:
                        slack_tool_name = tool.name
                        slack_tool_schema = tool.inputSchema
                        break
                if not slack_tool_name:
                    # Chọn tool đầu tiên
                    slack_tool_name = slack_tools[0][0]
                    for tool in response.tools:
                        if tool.name == slack_tool_name:
                            slack_tool_schema = tool.inputSchema
                            break

                print(f"\n=== THỬ GỌI SLACK TOOL: {slack_tool_name} ===")
                print(f"Schema: {json.dumps(slack_tool_schema, indent=2)}")
                try:
                    # Gọi không args trước (để xem schema yêu cầu gì)
                    result = await session.call_tool(slack_tool_name, arguments={})
                    if result.content:
                        text = "\n".join(c.text if c.type == "text" else str(c) for c in result.content)
                        try:
                            data = json.loads(text)
                            print(f"\nKết quả (JSON): {json.dumps(data, indent=2, ensure_ascii=False)[:2000]}")
                        except json.JSONDecodeError:
                            print(f"\nKết quả (text): {text[:2000]}")
                    else:
                        print("Không có nội dung trả về")
                except Exception as e:
                    print(f"Lỗi khi gọi tool: {e}")


if __name__ == "__main__":
    asyncio.run(main())
