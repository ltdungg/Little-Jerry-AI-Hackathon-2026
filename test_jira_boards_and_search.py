"""Test Jira MCP: GetAllBoards + SearchIssues qua AgentCore Gateway."""
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

JIRA_PREFIX = "target-quick-start-0r2gmc___"


def print_json(data, label=""):
    if label:
        print(f"\n{'='*60}")
        print(f"  {label}")
        print(f"{'='*60}")
    print(json.dumps(data, indent=2, ensure_ascii=False))


async def call_tool(session, tool_name, arguments):
    result = await session.call_tool(tool_name, arguments=arguments)
    if not result.content:
        return None
    text = "\n".join(c.text if c.type == "text" else str(c) for c in result.content)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_text": text}


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

            # 1. GetAllBoards
            print("\n>>> Đang gọi GetAllBoards...")
            boards = await call_tool(session, f"{JIRA_PREFIX}GetAllBoards", {"maxResults": 50})
            if boards is None:
                print("  Không có dữ liệu trả về.")
            elif isinstance(boards, dict) and "raw_text" in boards:
                print(f"  Raw text:\n{boards['raw_text'][:1500]}")
            else:
                values = boards.get("values", boards) if isinstance(boards, dict) else boards
                if isinstance(values, list):
                    print(f"  Tìm thấy {len(values)} boards:")
                    for b in values[:10]:
                        name = b.get("name", b.get("id", "?"))
                        btype = b.get("type", "")
                        print(f"    - [{btype}] {name} (id={b.get('id', '')})")
                else:
                    print_json(boards, "GetAllBoards raw")

            # 2. SearchIssues - tìm 5 issues mới nhất
            print("\n>>> Đang gọi SearchIssues (order by created DESC, maxResults=5)...")
            search_result = await call_tool(
                session,
                f"{JIRA_PREFIX}SearchIssues",
                {"jql": "order by created DESC", "maxResults": 5},
            )
            if search_result is None:
                print("  Không có dữ liệu trả về.")
            elif isinstance(search_result, dict) and "raw_text" in search_result:
                print(f"  Raw text:\n{search_result['raw_text'][:2000]}")
            else:
                issues = search_result.get("issues", search_result) if isinstance(search_result, dict) else search_result
                if isinstance(issues, list):
                    print(f"  Tìm thấy {len(issues)} issues:")
                    for issue in issues:
                        key = issue.get("key", "?")
                        fields = issue.get("fields", issue)
                        summary = fields.get("summary", "(no summary)")
                        status = fields.get("status", {})
                        status_name = status.get("name", "?") if isinstance(status, dict) else str(status)
                        assignee = fields.get("assignee", {})
                        assignee_name = assignee.get("displayName", "Unassigned") if isinstance(assignee, dict) and assignee else "Unassigned"
                        print(f"    [{key}] {summary}")
                        print(f"      Status: {status_name} | Assignee: {assignee_name}")
                else:
                    print_json(search_result, "SearchIssues raw")


if __name__ == "__main__":
    asyncio.run(main())
