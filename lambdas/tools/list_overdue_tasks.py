import asyncio
import structlog
from lambdas.common.utils import build_response, build_error_response
from agents.common.clients.jira_mcp import get_overdue_tasks, parse_jira_issue

logger = structlog.get_logger()


def lambda_handler(event, context):
    """List overdue tasks. Fetches from Jira MCP (source of truth)."""
    project_id = event.get("project_id")

    try:
        raw_issues = asyncio.run(get_overdue_tasks(project_id))
        tasks = [parse_jira_issue(i) for i in raw_issues]
        return build_response(200, tasks)
    except Exception as e:
        logger.error("jira_mcp_overdue_tasks_failed", error=str(e))
        return build_error_response(502, "JIRA_ERROR", f"Failed to fetch overdue tasks from Jira: {str(e)}")
