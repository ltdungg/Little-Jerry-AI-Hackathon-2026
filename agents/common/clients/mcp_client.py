import os
import asyncio
from typing import List, Any
import structlog
import json

from strands.types.tools import ToolSpec
from strands.tools import PythonAgentTool

logger = structlog.get_logger()

def _create_mcp_tool_wrapper(tool_name: str, spec: ToolSpec) -> PythonAgentTool:
    """Create a strands PythonAgentTool that wraps an MCP tool call through Gateway."""
    async def invoke_tool(**kwargs: Any) -> Any:
        from mcp.client.streamable_http import streamablehttp_client
        from mcp.client.session import ClientSession
        from agents.common.clients.jira_mcp import _get_gateway_jwt_token, get_gateway_url
        
        token = _get_gateway_jwt_token()
        if not token:
            return "Lỗi: Không lấy được token xác thực từ Cognito để gọi Gateway."

        url = get_gateway_url()
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            async with streamablehttp_client(url, headers=headers) as (read_stream, write_stream, _):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    result = await session.call_tool(tool_name, arguments=kwargs)
                    
                    if result.content:
                        text = "\n".join(
                            c.text if c.type == "text" else str(c)
                            for c in result.content
                        )
                        # Trả về JSON nếu parse được, hoặc text thuần
                        try:
                            return json.loads(text)
                        except json.JSONDecodeError:
                            return text
                    return "Success"
        except Exception as e:
            if hasattr(e, 'exceptions'):
                for sub_e in e.exceptions:
                    logger.error("mcp_tool_invocation_failed_sub", tool=tool_name, error=str(sub_e))
                return f"Lỗi (nhiều lỗi con) khi thực thi tool {tool_name}. Vui lòng xem log."
            else:
                logger.error("mcp_tool_invocation_failed", tool=tool_name, error=str(e))
                return f"Lỗi khi thực thi tool {tool_name}: {str(e)}"

    return PythonAgentTool(tool_name, spec, invoke_tool)

async def fetch_mcp_tools_for_target(target_name: str) -> List[PythonAgentTool]:
    """Fetch all tools directly from the MCP Server (AgentCore Gateway) and filter by target."""
    from mcp.client.streamable_http import streamablehttp_client
    from mcp.client.session import ClientSession
    from agents.common.clients.jira_mcp import _get_gateway_jwt_token, get_gateway_url
    
    token = _get_gateway_jwt_token()
    if not token:
        logger.warning("mcp_gateway_token_missing", target=target_name)
        return []

    url = get_gateway_url()
    headers = {"Authorization": f"Bearer {token}"}
    tools = []
    
    try:
        async with streamablehttp_client(url, headers=headers) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                response = await session.list_tools()
                
                target_lower = target_name.lower()

                # Gateway tool naming: "targetname___operationId"
                # e.g. jira___searchIssues, slack___postMessage
                target_prefixes = [target_lower]
                
                for tool in response.tools:
                    name_desc = f"{tool.name} {tool.description}".lower()
                    
                    if any(p in name_desc for p in target_prefixes):
                        spec = ToolSpec(
                            name=tool.name,
                            description=tool.description,
                            inputSchema=tool.inputSchema
                        )
                        wrapped_tool = _create_mcp_tool_wrapper(tool.name, spec)
                        tools.append(wrapped_tool)
                        
    except Exception as e:
        if hasattr(e, 'exceptions'):
            for sub_e in e.exceptions:
                logger.error("fetch_mcp_tools_failed_sub", target=target_name, url=url, error=str(sub_e))
        else:
            logger.error("fetch_mcp_tools_failed", target=target_name, url=url, error=str(e))
        
    return tools
