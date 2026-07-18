import os
import asyncio
from typing import List, Any
import structlog

# mcp SDK from Anthropic
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession
from strands.types.tools import ToolSpec
from strands.tools import PythonAgentTool

logger = structlog.get_logger()

def _create_mcp_tool_wrapper(target_name: str, tool_name: str, spec: ToolSpec) -> PythonAgentTool:
    """Create a strands PythonAgentTool that wraps an MCP tool call."""
    async def invoke_tool(**kwargs: Any) -> Any:
        import boto3
        
        # Determine the direct MCP URL
        if target_name == "jira":
            url = "https://mcp.atlassian.com/v1/mcp/authv2"
        elif target_name == "slack":
            url = "https://mcp.slack.com/mcp"
        else:
            return f"Lỗi: Không hỗ trợ target {target_name}"
        
        
        # Lấy token Admin từ Secrets Manager
        project_name = os.environ.get("PROJECT_NAME", "npo-ai")
        env = os.environ.get("ENVIRONMENT", "dev")
        region = os.environ.get("REGION", "ap-southeast-2")
        secret_name = f"{project_name}-{env}-{target_name}-admin-access-token"
        try:
            sm = boto3.client("secretsmanager", region_name=region)
            token = sm.get_secret_value(SecretId=secret_name).get("SecretString", "")
        except Exception as e:
            logger.error("mcp_token_fetch_failed", target=target_name, error=str(e))
            token = ""
            
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        try:
            async with sse_client(url, headers=headers) as streams:
                async with ClientSession(streams[0], streams[1]) as session:
                    await session.initialize()
                    result = await session.call_tool(tool_name, arguments=kwargs)
                    # Convert CallToolResult back to a string/JSON response
                    if result.content:
                        return "\\n".join(
                            c.text if c.type == "text" else str(c)
                            for c in result.content
                        )
                    return "Success"
        except Exception as e:
            # Check if it's an ExceptionGroup (Python 3.11+)
            if hasattr(e, 'exceptions'):
                for sub_e in e.exceptions:
                    logger.error("mcp_tool_invocation_failed_sub", target=target_name, tool=tool_name, error=str(sub_e))
                return f"Lỗi (nhiều lỗi con) khi thực thi tool {tool_name}. Vui lòng xem log."
            else:
                logger.error("mcp_tool_invocation_failed", target=target_name, tool=tool_name, error=str(e))
                return f"Lỗi khi thực thi tool {tool_name}: {str(e)}"

    return PythonAgentTool(tool_name, spec, invoke_tool)

async def fetch_mcp_tools_for_target(target_name: str) -> List[PythonAgentTool]:
    """Fetch all tools directly from the MCP Server for a specific target and wrap them as strands tools."""
    import boto3
    
    # Determine the direct MCP URL
    if target_name == "jira":
        url = "https://mcp.atlassian.com/v1/mcp/authv2"
    elif target_name == "slack":
        url = "https://mcp.slack.com/mcp"
    else:
        logger.warning("mcp_target_not_supported", target=target_name)
        return []
    
    # Lấy token Admin từ Secrets Manager
    project_name = os.environ.get("PROJECT_NAME", "npo-ai")
    env = os.environ.get("ENVIRONMENT", "dev")
    region = os.environ.get("REGION", "ap-southeast-2")
    # Ưu tiên lấy từ biến môi trường (dùng cho test/hardcode), nếu không có mới lấy từ Secrets Manager
    token = os.environ.get(f"{target_name.upper()}_ADMIN_TOKEN", "")
    if not token:
        try:
            secret_name = f"{project_name}-{env}-{target_name}-admin-access-token"
            resp = boto3.client("secretsmanager", region_name=region).get_secret_value(SecretId=secret_name)
            token = resp.get("SecretString", "")
        except Exception as e:
            logger.warning("mcp_token_fetch_failed", error=str(e), target=target_name)
            token = ""
        
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    tools = []
    
    try:
        async with sse_client(url, headers=headers) as streams:
            async with ClientSession(streams[0], streams[1]) as session:
                await session.initialize()
                response = await session.list_tools()
                
                for tool in response.tools:
                    spec = ToolSpec(
                        name=tool.name,
                        description=tool.description,
                        inputSchema=tool.inputSchema
                    )
                    wrapped_tool = _create_mcp_tool_wrapper(target_name, tool.name, spec)
                    tools.append(wrapped_tool)
    except Exception as e:
        # Check if it's an ExceptionGroup (Python 3.11+)
        if hasattr(e, 'exceptions'):
            for sub_e in e.exceptions:
                logger.error("fetch_mcp_tools_failed_sub", target=target_name, url=url, error=str(sub_e))
        else:
            logger.error("fetch_mcp_tools_failed", target=target_name, url=url, error=str(e))
        
    return tools
