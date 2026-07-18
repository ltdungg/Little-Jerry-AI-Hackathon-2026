import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

async def test_gateway():
    from mcp.client.streamable_http import streamablehttp_client
    from mcp.client.session import ClientSession
    
    url = "https://gateway-quick-start-776830-hycicfzjgi.gateway.bedrock-agentcore.ap-southeast-2.amazonaws.com/mcp"
    headers = {"Authorization": "Bearer fake_token"}
    
    try:
        async with streamablehttp_client(url, headers=headers) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                response = await session.list_tools()
                print("Connected! Tools:", len(response.tools))
                for t in response.tools:
                    print("-", t.name)
    except Exception as e:
        print("Error connecting to gateway:", e)

if __name__ == "__main__":
    asyncio.run(test_gateway())
