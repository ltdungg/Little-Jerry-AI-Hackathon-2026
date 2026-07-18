"""
Unified Lambda handler for all AgentCore Gateway tools.

Routes tool invocations to the appropriate handler based on the tool name.
This Lambda is invoked by the AgentCore Gateway when agents call tools.
"""
import json
import os
import structlog

from lambdas.tools.get_project import lambda_handler as get_project_handler
from lambdas.tools.list_project_tasks import lambda_handler as list_project_tasks_handler
from lambdas.tools.list_overdue_tasks import lambda_handler as list_overdue_tasks_handler
from lambdas.tools.list_project_risks import lambda_handler as list_project_risks_handler
from lambdas.tools.propose_task_change import lambda_handler as propose_task_change_handler
from lambdas.tools.commit_task_change import lambda_handler as commit_task_change_handler
from lambdas.tools.store_report_artifact import lambda_handler as store_report_artifact_handler
from lambdas.tools.create_slack_draft import lambda_handler as create_slack_draft_handler
from lambdas.tools.send_slack_message import lambda_handler as send_slack_message_handler

logger = structlog.get_logger()

# Map tool names to their Lambda handlers
TOOL_HANDLERS = {
    "get_project": get_project_handler,
    "list_project_tasks": list_project_tasks_handler,
    "list_overdue_tasks": list_overdue_tasks_handler,
    "list_project_risks": list_project_risks_handler,
    "propose_task_change": propose_task_change_handler,
    "commit_task_change": commit_task_change_handler,
    "store_report_artifact": store_report_artifact_handler,
    "create_slack_draft": create_slack_draft_handler,
    "send_slack_message": send_slack_message_handler,
}


def lambda_handler(event, context):
    """
    Handle tool invocations from AgentCore Gateway.

    The event structure from the Gateway contains:
    - tool_name: Name of the tool to invoke
    - tool_input: Input parameters for the tool
    - Additional context from the agent
    """
    tool_name = event.get("tool_name") or event.get("tool")
    tool_input = event.get("tool_input") or event.get("input") or event

    logger.info("tool_invocation_received", tool_name=tool_name, tool_input_keys=list(tool_input.keys()) if isinstance(tool_input, dict) else "not_dict")

    if not tool_name:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing tool_name in event"})
        }

    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        logger.error("unknown_tool", tool_name=tool_name, available_tools=list(TOOL_HANDLERS.keys()))
        return {
            "statusCode": 404,
            "body": json.dumps({"error": f"Unknown tool: {tool_name}"})
        }
    try:
        # Create a synthetic Lambda event in the format the handler expects
        synthetic_event = {
            "body": json.dumps(tool_input) if isinstance(tool_input, dict) else tool_input,
            "requestContext": {}
        }

        result = handler(synthetic_event, context)
        logger.info("tool_invocation_success", tool_name=tool_name, status_code=result.get("statusCode"))
        return result
    except Exception as e:
        logger.error("tool_invocation_error", tool_name=tool_name, error=str(e), exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Tool execution failed: {str(e)}"})
        }
