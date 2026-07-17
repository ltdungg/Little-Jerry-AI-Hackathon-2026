"""Smoke tests for shared/models package."""
from __future__ import annotations

from datetime import datetime, date

from shared.models.identity import Tenant, UserProfile, TenantMembership, ProjectMember
from shared.models.project import Program, Project, Milestone
from shared.models.task import Task
from shared.models.risk import Risk
from shared.models.workflow import Workflow, AgentTask, WorkflowEvent
from shared.models.connector import Connector, SyncExecution
from shared.models.approval import Approval
from shared.models.citation import Citation
from shared.models.events import DomainEvent
from shared.models.conversation import ConversationSession
from shared.models.keys import BusinessDataKeys, WorkflowStateKeys
from shared.models.errors import ErrorCode, ErrorDetail


def _ts(y=2026, m=7, d=17):
    return datetime(y, m, d)


def _dt(y=2026, m=7, d=17):
    return date(y, m, d)


class TestIdentityModels:
    def test_tenant(self):
        t = Tenant(
            tenant_id="ten_01J", name="Green Hope Foundation", slug="ghf",
            status="active", default_timezone="Asia/Bangkok", default_locale="vi-VN",
            data_classification_policy="internal", created_at=_ts(), updated_at=_ts(),
        )
        assert t.name == "Green Hope Foundation"
        assert t.status == "active"

    def test_user_profile(self):
        up = UserProfile(
            user_id="usr_01J", cognito_sub="00000000-0000-0000-0000-000000000000",
            tenant_id="ten_01J", email_normalized="user@example.org",
            display_name="Minh Nguyen", status="active", locale="vi-VN",
            timezone="Asia/Bangkok", created_at=_ts(), updated_at=_ts(),
        )
        assert up.display_name == "Minh Nguyen"

    def test_tenant_membership(self):
        tm = TenantMembership(
            tenant_id="ten_01J", user_id="usr_01J",
            roles=["npo_staff"], capabilities=["knowledge:read"],
            status="active", joined_at=_ts(),
        )
        assert tm.roles == ["npo_staff"]

    def test_project_member(self):
        pm = ProjectMember(
            tenant_id="ten_01J", project_id="prj_01J", user_id="usr_01J",
            project_role="project_manager", capabilities=["project:read"],
            status="active", joined_at=_ts(),
        )
        assert pm.project_role == "project_manager"


class TestProjectModels:
    def test_program(self):
        p = Program(
            program_id="prg_01J", tenant_id="ten_01J", name="Community Resilience",
            description="Regional", status="active", owner_user_id="usr_01J",
            start_date=_dt(), end_date=_dt(), created_at=_ts(), updated_at=_ts(),
        )
        assert p.name == "Community Resilience"

    def test_project(self):
        p = Project(
            project_id="prj_01J", tenant_id="ten_01J", program_id="prg_01J",
            code="GREEN-HOPE", name="Green Hope", description="Community program",
            status="active", health="amber", manager_user_id="usr_01J",
            start_date=_dt(), end_date=_dt(), tags=["community"],
            knowledge_source_ids=["con_sharepoint_1"],
            created_at=_ts(), updated_at=_ts(),
        )
        assert p.health == "amber"

    def test_milestone_with_completed_at(self):
        m = Milestone(
            milestone_id="mil_01J", tenant_id="ten_01J", project_id="prj_01J",
            name="Training rollout", description="Complete training",
            status="in_progress", health="amber", target_date=_dt(2026, 9, 30),
            owner_user_id="usr_01J", created_at=_ts(), updated_at=_ts(),
        )
        assert m.completed_at is None

    def test_milestone_completed(self):
        m = Milestone(
            milestone_id="mil_01J", tenant_id="ten_01J", project_id="prj_01J",
            name="Done", description="", status="completed", health="green",
            target_date=_dt(), completed_at=_dt(), owner_user_id="usr_01J",
            created_at=_ts(), updated_at=_ts(),
        )
        assert m.completed_at == _dt()


class TestTaskModel:
    def test_task(self):
        t = Task(
            task_id="tsk_01J", tenant_id="ten_01J", project_id="prj_01J",
            title="Review logistics plan", description="Review and approve",
            status="in_progress", priority="high", assignee_user_id="usr_01J",
            created_by="usr_01J", due_date=_dt(2026, 7, 24), tags=["logistics"],
            created_at=_ts(), updated_at=_ts(), updated_by="usr_01J",
            related_risk_ids=[],
        )
        assert t.priority == "high"
        assert t.version == 1


class TestRiskModel:
    def test_risk(self):
        r = Risk(
            risk_id="rsk_01J", tenant_id="ten_01J", project_id="prj_01J",
            title="Training materials late", description="Supplier delivery",
            status="open", category="delivery", likelihood=4, impact=4,
            score=16, severity="high", owner_user_id="usr_01J",
            source_citation_ids=[], created_at=_ts(), updated_at=_ts(),
        )
        assert r.score == 16


class TestWorkflowModels:
    def test_workflow(self):
        w = Workflow(
            workflow_id="wf_01J", tenant_id="ten_01J", user_id="usr_01J",
            request_type="weekly_report", request_summary="Create report",
            status="running", mode="supervisor",
            created_at=_ts(), updated_at=_ts(),
        )
        assert w.status == "running"

    def test_agent_task_defaults(self):
        at = AgentTask(
            task_id="agt_01J", workflow_id="wf_01J",
            agent_name="knowledge-agent", intent="knowledge_search",
            status="completed",
        )
        assert at.dependency_task_ids == []
        assert at.citation_ids == []
        assert at.attempt == 1

    def test_workflow_event(self):
        e = WorkflowEvent(
            event_id="evt_01J", workflow_id="wf_01J",
            event_type="agent_task_completed", public_message="Sources searched",
            actor_type="agent", actor_id="knowledge-agent",
            safe_metadata={}, created_at=_ts(),
        )
        assert e.event_type == "agent_task_completed"


class TestConnectorModels:
    def test_connector(self):
        c = Connector(
            connector_id="con_01J", tenant_id="ten_01J",
            connector_type="sharepoint", display_name="Org SharePoint",
            status="healthy", mode="live", secret_ref="npo-ai/dev/con",
            allowed_sources=[], created_at=_ts(), updated_at=_ts(),
        )
        assert c.status == "healthy"

    def test_sync_execution(self):
        s = SyncExecution(
            sync_id="syn_01J", tenant_id="ten_01J", connector_id="con_01J",
            source_id="site-id", status="completed", mode="incremental",
            trigger="schedule", started_at=_ts(), items_seen=100,
            items_created=10, items_updated=5, items_unchanged=84,
            items_deleted=0, items_quarantined=1, error_summary=[],
        )
        assert s.items_seen == 100


class TestApprovalModel:
    def test_approval(self):
        a = Approval(
            approval_id="apr_01J", workflow_id="wf_01J", tenant_id="ten_01J",
            requested_by="usr_01J", required_confirmer_user_id="usr_01J",
            action_type="update_task", action_hash="sha256:abc",
            action_preview={}, entity_version=3, status="pending",
            expires_at=1780000000, created_at=_ts(),
        )
        assert a.status == "pending"


class TestCitationModel:
    def test_citation(self):
        c = Citation(
            citation_id="cit_01J", tenant_id="ten_01J", project_id="prj_01J",
            source_system="sharepoint", canonical_source_id="sharepoint:site:item",
            excerpt="Approval requires two reviewers", classification="internal",
            retrieved_at=_ts(),
        )
        assert c.classification == "internal"


class TestConversationModel:
    def test_session(self):
        s = ConversationSession(
            session_id="ses_01J", tenant_id="ten_01J", user_id="usr_01J",
            project_id="prj_01J", title="Procurement questions",
            created_at=_ts(),
        )
        assert s.status == "active"


class TestEventsModel:
    def test_domain_event(self):
        e = DomainEvent(
            event_id="evt_01J", event_type="task.updated.v1",
            occurred_at=_ts(), tenant_id="ten_01J", project_id="prj_01J",
            actor={"actor_type": "user", "actor_id": "usr_01J"},
            correlation_id="corr_01J",
            entity={"entity_type": "task", "entity_id": "tsk_01J"},
            safe_changes={"changed_fields": ["due_date"]},
        )
        assert e.event_type == "task.updated.v1"


class TestBusinessDataKeys:
    def test_tenant_pk(self):
        assert BusinessDataKeys.tenant_pk("ten_01J") == "TENANT#ten_01J"

    def test_project_pk(self):
        assert BusinessDataKeys.project_pk("ten_01J", "prj_01J") == "TENANT#ten_01J#PROJECT#prj_01J"

    def test_task_sk(self):
        assert BusinessDataKeys.task_sk("tsk_01J") == "TASK#tsk_01J"

    def test_risk_sk(self):
        assert BusinessDataKeys.risk_sk("rsk_01J") == "RISK#rsk_01J"

    def test_milestone_sk(self):
        assert BusinessDataKeys.milestone_sk("mil_01J") == "MILESTONE#mil_01J"

    def test_report_sk(self):
        sk = BusinessDataKeys.report_sk("2026-07-17T00:00:00Z", "rpt_01J")
        assert sk == "REPORT#2026-07-17T00:00:00Z#rpt_01J"

    def test_connector_summary_sk(self):
        assert BusinessDataKeys.connector_summary_sk("con_01J") == "CONNECTOR#con_01J"

    def test_connector_config(self):
        pk = BusinessDataKeys.connector_config_pk("ten_01J", "con_01J")
        assert pk == "TENANT#ten_01J#CONNECTOR#con_01J"
        assert BusinessDataKeys.connector_config_sk() == "CONFIG"

    def test_sync_sk(self):
        sk = BusinessDataKeys.sync_sk("2026-07-17T00:00:00Z", "syn_01J")
        assert sk == "SYNC#2026-07-17T00:00:00Z#syn_01J"

    def test_document_sk(self):
        assert BusinessDataKeys.document_sk("abc123") == "DOCUMENT#abc123"

    def test_task_gsi1(self):
        pk, sk = BusinessDataKeys.task_gsi1(
            "ten_01J", "usr_01J", "2026-07-24", "in_progress", "prj_01J", "tsk_01J",
        )
        assert pk == "TENANT#ten_01J#ASSIGNEE#usr_01J"
        assert sk == "DUE#2026-07-24#STATUS#in_progress#PROJECT#prj_01J#TASK#tsk_01J"

    def test_risk_gsi1(self):
        pk, sk = BusinessDataKeys.risk_gsi1(
            "ten_01J", "usr_01J", "2026-07-24", "high", "prj_01J", "rsk_01J",
        )
        assert pk == "TENANT#ten_01J#RISK_OWNER#usr_01J"
        assert "SEVERITY#high" in sk

    def test_task_gsi2(self):
        pk, sk = BusinessDataKeys.task_gsi2(
            "ten_01J", "prj_01J", "in_progress", "2026-07-24", "high", "tsk_01J",
        )
        assert pk == "TENANT#ten_01J#PROJECT#prj_01J#TASK_STATUS#in_progress"
        assert "PRIORITY#high" in sk

    def test_risk_gsi2(self):
        pk, sk = BusinessDataKeys.risk_gsi2(
            "ten_01J", "prj_01J", "open", "02-high", "2026-07-24", "rsk_01J",
        )
        assert pk == "TENANT#ten_01J#PROJECT#prj_01J#RISK_STATUS#open"
        assert "SEVERITY#02-high" in sk

    def test_connector_gsi2(self):
        pk, sk = BusinessDataKeys.connector_gsi2("ten_01J", "healthy", "sharepoint", "con_01J")
        assert pk == "TENANT#ten_01J#CONNECTOR_STATUS#healthy"
        assert sk == "TYPE#sharepoint#CONNECTOR#con_01J"

    def test_project_listing_gsi1(self):
        pk, sk = BusinessDataKeys.project_listing_gsi1(
            "ten_01J", "prg_01J", "active", "green hope", "prj_01J",
        )
        assert pk == "TENANT#ten_01J#PROGRAM#prg_01J"
        assert sk == "PROJECT#active#green hope#prj_01J"

    def test_user_project_edge(self):
        pk = BusinessDataKeys.user_pk("ten_01J", "usr_01J")
        sk = BusinessDataKeys.user_project_edge_sk("prj_01J")
        assert pk == "TENANT#ten_01J#USER#usr_01J"
        assert sk == "PROJECT#prj_01J"


class TestWorkflowStateKeys:
    def test_workflow_pk(self):
        assert WorkflowStateKeys.workflow_pk("wf_01J") == "WORKFLOW#wf_01J"

    def test_workflow_meta(self):
        assert WorkflowStateKeys.workflow_meta_sk() == "META"

    def test_workflow_plan(self):
        assert WorkflowStateKeys.workflow_plan_sk(1) == "PLAN#1"

    def test_workflow_task_attempt_padding(self):
        assert WorkflowStateKeys.workflow_task_sk("agt_01J", 1) == "TASK#agt_01J#ATTEMPT#01"
        assert WorkflowStateKeys.workflow_task_sk("agt_01J", 12) == "TASK#agt_01J#ATTEMPT#12"

    def test_workflow_event(self):
        sk = WorkflowStateKeys.workflow_event_sk("2026-07-17T00:00:04Z", "evt_01J")
        assert sk == "EVENT#2026-07-17T00:00:04Z#evt_01J"

    def test_idempotency(self):
        pk = WorkflowStateKeys.idempotency_pk("ten_01J", "usr_01J", "keyhash")
        assert pk == "IDEMPOTENCY#ten_01J#usr_01J#keyhash"
        assert WorkflowStateKeys.idempotency_sk() == "REQUEST"

    def test_user_workflow_projection(self):
        pk = WorkflowStateKeys.user_workflow_projection_pk("ten_01J", "usr_01J")
        sk = WorkflowStateKeys.user_workflow_projection_sk("2026-07-17T00:00:00Z", "wf_01J")
        assert pk == "TENANT#ten_01J#USER#usr_01J"
        assert sk == "WORKFLOW#2026-07-17T00:00:00Z#wf_01J"

    def test_session(self):
        assert WorkflowStateKeys.session_pk("ses_01J") == "SESSION#ses_01J"
        assert WorkflowStateKeys.session_meta_sk() == "META"

    def test_workflow_status_gsi1(self):
        pk, sk = WorkflowStateKeys.workflow_status_gsi1(
            "ten_01J", "running", "2026-07-17T00:00:05Z", "wf_01J",
        )
        assert pk == "TENANT#ten_01J#WORKFLOW_STATUS#running"
        assert sk == "UPDATED#2026-07-17T00:00:05Z#WORKFLOW#wf_01J"

    def test_pending_approval_gsi1(self):
        pk, sk = WorkflowStateKeys.pending_approval_gsi1(
            "ten_01J", "usr_01J", "1780000000", "wf_01J", "apr_01J",
        )
        assert "PENDING_APPROVAL" in pk
        assert "APPROVAL#apr_01J" in sk


class TestErrorCode:
    def test_all_codes_exist(self):
        codes = [
            "validation_error", "unauthenticated", "unauthorized", "not_found",
            "entity_version_conflict", "idempotency_conflict", "workflow_state_conflict",
            "approval_expired", "approval_invalidated", "rate_limited",
            "dependency_unavailable", "insufficient_evidence", "internal_error",
        ]
        for code in codes:
            assert ErrorCode(code) is not None
