import os

import pytest

from agents.common.clients.dynamodb_client import BusinessDataClient


@pytest.fixture
def business_table(dynamodb, monkeypatch):
    monkeypatch.setenv("BUSINESS_TABLE", "BusinessData-test")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    table = dynamodb.create_table(
        TableName="BusinessData-test",
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    table.wait_until_exists()
    return table


@pytest.fixture
def client(business_table):
    return BusinessDataClient(tenant_id="aiv")


def test_project_scoped_report_roundtrip(client):
    client.put_project({"project_id": "proj-1", "name": "Rural Education", "status": "active"})
    client.put_report("proj-1", {
        "report_id": "rpt-1", "project_id": "proj-1", "category": "daily",
        "report_type": "daily_status", "content": "hello", "status": "draft",
        "created_at": "2026-07-18T10:00:00+00:00",
    })

    reports = client.list_reports("proj-1")
    assert len(reports) == 1
    assert reports[0]["report_id"] == "rpt-1"

    assert client.get_report_by_id("rpt-1")["content"] == "hello"

    client.update_report("proj-1", "rpt-1", {"status": "edited", "content": "updated"})
    updated = client.get_report("proj-1", "rpt-1")
    assert updated["status"] == "edited"
    assert updated["content"] == "updated"


def test_list_reports_category_filter(client):
    client.put_project({"project_id": "proj-1", "name": "Rural Education", "status": "active"})
    client.put_report("proj-1", {
        "report_id": "rpt-daily", "project_id": "proj-1", "category": "daily",
        "report_type": "daily_status", "content": "d", "status": "draft",
        "created_at": "2026-07-18T09:00:00+00:00",
    })
    client.put_report("proj-1", {
        "report_id": "rpt-weekly", "project_id": "proj-1", "category": "weekly",
        "report_type": "weekly_status", "content": "w", "status": "draft",
        "created_at": "2026-07-18T10:00:00+00:00",
    })

    weekly = client.list_reports("proj-1", category_filter="weekly")
    assert [r["report_id"] for r in weekly] == ["rpt-weekly"]

    all_reports = client.list_all_reports()
    assert {r["report_id"] for r in all_reports} == {"rpt-daily", "rpt-weekly"}


def test_issue_crud_and_cross_project_lookup(client):
    client.put_project({"project_id": "proj-1", "name": "P1", "status": "active"})
    client.put_issue("proj-1", {"issue_id": "iss-1", "project_id": "proj-1", "title": "Chậm tiến độ", "status": "new"})

    assert len(client.list_issues("proj-1")) == 1
    assert len(client.list_all_issues()) == 1

    client.update_issue("proj-1", "iss-1", {"status": "investigating", "owner_name": "Sarah"})
    updated = client.get_issue("proj-1", "iss-1")
    assert updated["status"] == "investigating"
    assert updated["owner_name"] == "Sarah"

    client.delete_issue("proj-1", "iss-1")
    assert client.get_issue("proj-1", "iss-1") is None


def test_team_report_lifecycle(client):
    client.put_team({"team_id": "team-1", "name": "Education", "program_names": ["Rural Education"]})
    client.put_team_report("team-1", {
        "team_id": "team-1", "team_name": "Education", "week": "2026-W29",
        "highlights": [{"text": "Đạt tiến độ", "program_id": "proj-1"}],
        "issues": [], "next_priorities": [], "status": "draft",
        "member_submissions": [{"user_id": "u1", "submitted": False}],
    })

    reports = client.list_team_reports("team-1")
    assert len(reports) == 1
    assert reports[0]["status"] == "draft"

    client.update_team_report("team-1", "2026-W29", {"status": "approved"})
    assert client.list_team_reports("team-1")[0]["status"] == "approved"

    all_team_reports = client.list_all_team_reports()
    assert len(all_team_reports) == 1


def test_meeting_and_handoff_are_tenant_scoped_not_project_scoped(client):
    client.put_meeting({"meeting_id": "mtg-1", "project_id": "proj-1", "title": "Họp tuần"})
    client.put_meeting({"meeting_id": "mtg-2", "project_id": "proj-2", "title": "Họp khác"})
    assert len(client.list_meetings()) == 2
    assert client.get_meeting("mtg-1")["title"] == "Họp tuần"

    client.update_meeting("mtg-1", {"summary": "Đã cập nhật"})
    assert client.get_meeting("mtg-1")["summary"] == "Đã cập nhật"

    client.put_handoff({"handoff_id": "ho-1", "project_id": "proj-1", "status": "draft"})
    client.update_handoff("ho-1", {"status": "complete"})
    handoffs = client.list_handoffs()
    assert handoffs[0]["status"] == "complete"


def test_daily_update_roundtrip(client):
    client.put_project({"project_id": "proj-1", "name": "P1", "status": "active"})
    client.put_daily_update("proj-1", {
        "user_id": "u1", "user_name": "Sarah", "date": "2026-07-18",
        "project_id": "proj-1", "task_updates": [{"task_id": "t1", "status_after": "done"}],
        "status": "submitted",
    })

    updates_today = client.list_daily_updates("proj-1", date="2026-07-18")
    assert len(updates_today) == 1
    assert updates_today[0]["user_id"] == "u1"

    assert client.list_daily_updates("proj-1", date="2026-07-19") == []
