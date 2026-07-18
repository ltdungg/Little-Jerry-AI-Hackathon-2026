import asyncio
import os
import structlog
from lambdas.common.utils import build_response, build_error_response
from agents.common.clients.jira_mcp import get_project_tasks, parse_jira_issue

logger = structlog.get_logger()


def lambda_handler(event, context):
    """List tasks for a project. Fetches from Jira MCP (source of truth)."""
    project_id = event.get("project_id")
    status_filter = event.get("status_filter")

    if not project_id:
        return build_error_response(400, "BAD_REQUEST", "project_id is required")

    try:
        raw_issues = asyncio.run(get_project_tasks(project_id, status_filter))
        tasks = [parse_jira_issue(i) for i in raw_issues]
        return build_response(200, tasks)
    except Exception as e:
        logger.error("jira_mcp_list_tasks_failed", project_id=project_id, error=str(e))
        return build_error_response(502, "JIRA_ERROR", f"Failed to fetch tasks from Jira: {str(e)}")
