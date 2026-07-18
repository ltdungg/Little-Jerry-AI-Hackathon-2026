"""Jira Webhook Receiver Lambda.

Handles Jira webhook events:
- jira:issue_created → New issue created
- jira:issue_updated → Issue status/priority changed
- jira:issue_deleted → Issue deleted

Flow:
1. Receive Jira webhook via API Gateway
2. Parse event type and payload
3. Update DynamoDB metrics
4. Send Slack notification if critical
5. Trigger Risk Analysis Agent for overdue detection
"""
import json
import os
import time
import urllib.request
import urllib.parse
import boto3
import structlog
from datetime import datetime, timezone

logger = structlog.get_logger()

REGION = os.environ.get("REGION", "ap-southeast-2")
BUSINESS_TABLE = os.environ.get("BUSINESS_TABLE", "BusinessData")
ARTIFACT_BUCKET = os.environ.get("ARTIFACT_BUCKET", "")

_dynamodb = boto3.resource("dynamodb", region_name=REGION)
_table = _dynamodb.Table(BUSINESS_TABLE)


def _get_slack_token() -> str:
    """Get Slack bot token for notifications."""
    sm = boto3.client("secretsmanager", region_name=REGION)
    try:
        token_data = json.loads(
            sm.get_secret_value(SecretId="npo-ai-dev-slack-admin-access-token").get("SecretString", "{}")
        )
        return token_data.get("slack_bot_token", "")
    except Exception:
        return ""


def _send_slack_notification(channel_id: str, text: str) -> bool:
    """Send notification to Slack."""
    token = _get_slack_token()
    if not token or not channel_id:
        return False

    payload = json.dumps({"channel": channel_id, "text": text}).encode("utf-8")
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            return result.get("ok", False)
    except Exception as e:
        logger.error("slack_notification_failed", error=str(e))
        return False


def _update_project_metrics(project_key: str, issue: dict, event_type: str) -> None:
    """Update aggregated project metrics in DynamoDB."""
    try:
        # Get or create metrics item
        resp = _table.get_item(
            Key={"PK": f"TENANT#aiv#PROJECT#{project_key}", "SK": "METRICS"}
        )
        metrics = resp.get("Item", {
            "PK": f"TENANT#aiv#PROJECT#{project_key}",
            "SK": "METRICS",
            "project_id": project_key,
            "total_issues": 0,
            "open_issues": 0,
            "overdue_issues": 0,
            "critical_issues": 0,
            "last_updated": "",
        })

        # Update based on event type
        if event_type == "jira:issue_created":
            metrics["total_issues"] = metrics.get("total_issues", 0) + 1
            status = issue.get("fields", {}).get("status", {}).get("name", "")
            if status.upper() not in ("DONE", "CLOSED", "RESOLVED"):
                metrics["open_issues"] = metrics.get("open_issues", 0) + 1

        elif event_type == "jira:issue_updated":
            # Recalculate from current state (simplified)
            status = issue.get("fields", {}).get("status", {}).get("name", "")
            priority = issue.get("fields", {}).get("priority", {}).get("name", "")

            if priority.upper() in ("HIGHEST", "BLOCKER", "CRITICAL"):
                metrics["critical_issues"] = metrics.get("critical_issues", 0) + 1

        metrics["last_updated"] = datetime.now(timezone.utc).isoformat()

        _table.put_item(Item=metrics)
        logger.info("metrics_updated", project_key=project_key, event_type=event_type)

    except Exception as e:
        logger.error("metrics_update_failed", error=str(e), project_key=project_key)


def _check_overdue_and_alert(project_key: str, issue: dict) -> None:
    """Check if issue is overdue and send alert."""
    fields = issue.get("fields", {})
    due_date = fields.get("duedate")
    status = fields.get("status", {}).get("name", "")

    if not due_date or status.upper() in ("DONE", "CLOSED", "RESOLVED"):
        return

    try:
        due = datetime.fromisoformat(due_date)
        if due < datetime.now(timezone.utc):
            # Issue is overdue
            summary = fields.get("summary", "Unknown")
            assignee = fields.get("assignee", {})
            assignee_name = assignee.get("displayName", "Unassigned") if assignee else "Unassigned"

            alert_text = (
                f"🔴 *Task quá hạn!* \n"
                f"• Task: {summary}\n"
                f"• Assignee: {assignee_name}\n"
                f"• Due: {due_date}\n"
                f"• Project: {project_key}"
            )

            # Send to project Slack channel (if configured)
            # For now, log the alert
            logger.warning("overdue_issue_detected",
                         issue_key=issue.get("key"),
                         project_key=project_key,
                         due_date=due_date)

    except (ValueError, TypeError):
        pass


def lambda_handler(event, context):
    """Handle Jira webhook events."""
    body = event.get("body", "{}")
    try:
        payload = json.loads(body) if isinstance(body, str) else body
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON"})}

    # Extract event type from headers
    headers = event.get("headers", {})
    event_type = headers.get("x-jira-event", payload.get("webhookEvent", ""))

    if not event_type:
        return {"statusCode": 200, "body": json.dumps({"ok": True, "message": "No event type"})}

    # Parse issue data
    issue = payload.get("issue", {})
    project_key = issue.get("fields", {}).get("project", {}).get("key", "")

    if not project_key:
        return {"statusCode": 200, "body": json.dumps({"ok": True, "message": "No project key"})}

    logger.info("jira_webhook_received", event_type=event_type, project_key=project_key,
               issue_key=issue.get("key", ""))

    # Process different event types
    if event_type == "jira:issue_created":
        _update_project_metrics(project_key, issue, event_type)
        _check_overdue_and_alert(project_key, issue)

    elif event_type == "jira:issue_updated":
        _update_project_metrics(project_key, issue, event_type)
        _check_overdue_and_alert(project_key, issue)

        # Check for priority changes to critical
        changelog = payload.get("changelog", {})
        for item in changelog.get("items", []):
            if item.get("field") == "priority":
                new_value = item.get("toString", "")
                if new_value.upper() in ("HIGHEST", "BLOCKER"):
                    summary = issue.get("fields", {}).get("summary", "Unknown")
                    logger.warning("critical_priority_detected",
                                 issue_key=issue.get("key"),
                                 project_key=project_key)

    elif event_type == "jira:issue_deleted":
        _update_project_metrics(project_key, issue, event_type)

    return {
        "statusCode": 200,
        "body": json.dumps({"ok": True, "event_type": event_type}),
    }
