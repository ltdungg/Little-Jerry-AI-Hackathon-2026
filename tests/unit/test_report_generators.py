from shared.report_generators import (
    REPORT_GENERATORS,
    REPORT_TITLES,
    generate_daily_status,
    generate_weekly_status,
    generate_risk_summary,
    generate_progress_summary,
)


class _FakeClient:
    def __init__(self, project=None, tasks=None, risks=None, milestones=None, issues=None):
        self._project = project or {"project_id": "proj-1", "name": "Rural Education", "status": "at_risk", "health": "amber"}
        self._tasks = tasks or []
        self._risks = risks or []
        self._milestones = milestones or []
        self._issues = issues or []

    def get_project(self, project_id):
        return self._project

    def list_tasks(self, project_id):
        return self._tasks

    def list_risks(self, project_id):
        return self._risks

    def list_milestones(self, project_id):
        return self._milestones

    def list_issues(self, project_id, status_filter=None):
        return self._issues


def test_report_generators_registry_matches_titles():
    assert set(REPORT_GENERATORS.keys()) == set(REPORT_TITLES.keys())
    assert set(REPORT_GENERATORS.keys()) == {
        "daily_status", "weekly_status", "risk_summary", "progress_summary",
    }


def test_generate_daily_status_no_activity():
    client = _FakeClient(tasks=[{"status": "todo", "updated_at": "2020-01-01"}])
    content = generate_daily_status("proj-1", client)
    assert "Báo cáo ngày" in content
    assert "Không có hoạt động nào được ghi nhận trong ngày." in content


def test_generate_daily_status_with_completed_task_today():
    today = "2026-07-18T10:00:00+00:00"
    client = _FakeClient(tasks=[
        {"task_id": "t1", "title": "Việc A", "status": "done", "updated_at": today},
    ])
    content = generate_daily_status("proj-1", client)
    assert "Task hoàn thành: 1" in content
    assert 'Hoàn thành: "Việc A"' in content


def test_generate_weekly_status_counts_tasks_by_status():
    client = _FakeClient(tasks=[
        {"status": "done"}, {"status": "in_progress"}, {"status": "blocked"}, {"status": "todo"},
    ])
    content = generate_weekly_status("proj-1", client)
    assert "Báo cáo tuần" in content
    assert "Hoàn thành: 1/4" in content
    assert "Bị chặn: 1" in content


def test_generate_risk_summary_sorts_by_score_desc():
    client = _FakeClient(risks=[
        {"title": "Rủi ro thấp", "score": 2, "severity": "low", "status": "open"},
        {"title": "Rủi ro cao", "score": 20, "severity": "critical", "status": "open"},
    ])
    content = generate_risk_summary("proj-1", client)
    assert content.index("Rủi ro cao") < content.index("Rủi ro thấp")


def test_generate_progress_summary_lists_overdue_tasks():
    client = _FakeClient(tasks=[
        {"title": "Trễ hạn", "is_overdue": True, "due_date": "2026-07-01", "status": "in_progress"},
    ])
    content = generate_progress_summary("proj-1", client)
    assert "Task quá hạn" in content
    assert "Trễ hạn" in content
