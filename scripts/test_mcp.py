import sys
import os
import asyncio
from dotenv import load_dotenv

# Add project root to python path so we can import from agents
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agents.common.clients.mcp_client import fetch_mcp_tools_for_target

async def test_mcp(target: str):
    print(f"--- Đang test kết nối MCP tới {target} ---")
    print(f"1. Khởi tạo SSE Client và kết nối...")
    
    try:
        tools = await fetch_mcp_tools_for_target(target)
        if not tools:
            print(f"❌ Không lấy được tool nào từ {target}. Vui lòng kiểm tra lại Token hoặc mạng.")
        else:
            print(f"✅ Kết nối thành công! Đã lấy được {len(tools)} tools:")
            for t in tools:
                print(f"  - {t.name}: {t.description}")
    except Exception as e:
        print(f"❌ Lỗi ngoại lệ: {e}")
    
    print("-" * 40)

if __name__ == "__main__":
    # Tải biến môi trường từ .env (để lấy PROJECT_NAME, REGION)
    load_dotenv()
    
    # =====================================================================
    # HARDCODE TOKEN TẠI ĐÂY ĐỂ TEST NHANH (Bỏ trống nếu muốn dùng AWS Secrets)
    # =====================================================================
    # os.environ["JIRA_ADMIN_TOKEN"] = "YOUR_JIRA_TOKEN_HERE"
    # os.environ["SLACK_ADMIN_TOKEN"] = "YOUR_SLACK_TOKEN_HERE"
    # =====================================================================
    
    # Bạn có thể chạy: python test_mcp.py jira hoặc python test_mcp.py slack
    target = sys.argv[1] if len(sys.argv) > 1 else "slack"
    
    asyncio.run(test_mcp(target))
