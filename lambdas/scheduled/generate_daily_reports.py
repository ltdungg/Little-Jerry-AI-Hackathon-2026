"""EventBridge-scheduled Lambda — docs/REPORT-EXPORT-SPEC.md mục 6.

Runs every day at 18:00 Asia/Ho_Chi_Minh (cron `0 11 * * ? *` UTC, wired in
Terraform following the infra/modules/ingestion pattern). Always generates a
`daily` report per active project; if today is the configured weekend day it
*also* generates a separate `weekly` report — the two never replace each
other (see spec mục 6 — nếu hai lịch trùng thời điểm, sinh cả hai báo cáo).
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import structlog

from agents.common.clients.dynamodb_client import BusinessDataClient
from shared.report_generators import REPORT_GENERATORS, REPORT_TITLES

logger = structlog.get_logger()

DEFAULT_TENANT = "aiv"
REPORT_TIMEZONE = os.environ.get("REPORT_TIMEZONE", "Asia/Ho_Chi_Minh")
# Python weekday(): Monday=0 .. Sunday=6. Default Chủ nhật, xem
# docs/REPORT-EXPORT-SPEC.md mục 6 (giả định cần xác nhận với nghiệp vụ).
WEEKLY_REPORT_WEEKDAY = int(os.environ.get("WEEKLY_REPORT_WEEKDAY", "6"))


def _local_today():
    return datetime.now(timezone.utc).astimezone(ZoneInfo(REPORT_TIMEZONE)).date()


def _create_report(client: BusinessDataClient, project_id: str, report_type: str, category: str, period_start: str, period_end: str) -> dict:
    content = REPORT_GENERATORS[report_type](project_id, client)
    now = datetime.now(timezone.utc).isoformat()
    report = {
        "report_id": str(uuid.uuid4()),
        "project_id": project_id,
        "category": category,
        "report_type": report_type,
        "title": f"{REPORT_TITLES.get(report_type, 'Báo cáo')} — {period_end}",
        "period_start": period_start,
        "period_end": period_end,
        "status": "draft",
        "content": content,
        "pdf_s3_uri": None,
        "generated_at": now,
        "edited_at": None,
        "exported_at": None,
        "version": 1,
        "created_at": now,
        "created_by": "scheduled",
    }
    client.put_report(project_id, report)
    return report


def _already_generated(client: BusinessDataClient, project_id: str, category: str, period_end: str) -> bool:
    """Idempotency guard — a retried/duplicate EventBridge invocation must not
    create a second report for the same project + category + day."""
    existing = client.list_reports(project_id, category_filter=category)
    return any(r.get("period_end") == period_end for r in existing)


def lambda_handler(event, context):
    client = BusinessDataClient(tenant_id=DEFAULT_TENANT)
    today = _local_today()
    projects = [p for p in client.list_projects() if p.get("status", "active") == "active"]

    daily_created, daily_skipped = 0, 0
    weekly_created, weekly_skipped = 0, 0

    for p in projects:
        project_id = p.get("project_id")
        if not project_id:
            continue

        if _already_generated(client, project_id, "daily", today.isoformat()):
            daily_skipped += 1
        else:
            _create_report(client, project_id, "daily_status", "daily", today.isoformat(), today.isoformat())
            daily_created += 1

        if today.weekday() != WEEKLY_REPORT_WEEKDAY:
            continue

        week_start = (today - timedelta(days=6)).isoformat()
        if _already_generated(client, project_id, "weekly", today.isoformat()):
            weekly_skipped += 1
            continue

        _create_report(client, project_id, "weekly_status", "weekly", week_start, today.isoformat())
        weekly_created += 1

    result = {
        "date": today.isoformat(),
        "is_weekly_day": today.weekday() == WEEKLY_REPORT_WEEKDAY,
        "daily_created": daily_created,
        "daily_skipped": daily_skipped,
        "weekly_created": weekly_created,
        "weekly_skipped": weekly_skipped,
    }
    logger.info("scheduled_reports_generated", **result)
    return result
