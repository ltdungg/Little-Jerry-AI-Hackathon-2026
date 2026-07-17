from __future__ import annotations

class BusinessDataKeys:
    @staticmethod
    def tenant_pk(tenant_id: str) -> str: return f"TENANT#{tenant_id}"
    @staticmethod
    def program_pk(tenant_id: str) -> str: return f"TENANT#{tenant_id}"
    @staticmethod
    def program_sk(program_id: str) -> str: return f"PROGRAM#{program_id}"
    @staticmethod
    def user_pk(tenant_id: str, user_id: str) -> str: return f"TENANT#{tenant_id}#USER#{user_id}"
    @staticmethod
    def user_profile_sk() -> str: return "PROFILE"
    @staticmethod
    def user_membership_sk() -> str: return "MEMBERSHIP"
    @staticmethod
    def user_project_edge_sk(project_id: str) -> str: return f"PROJECT#{project_id}"
    @staticmethod
    def project_pk(tenant_id: str, project_id: str) -> str: return f"TENANT#{tenant_id}#PROJECT#{project_id}"
    @staticmethod
    def project_meta_sk() -> str: return "META"
    @staticmethod
    def project_member_sk(user_id: str) -> str: return f"MEMBER#{user_id}"
    @staticmethod
    def milestone_sk(milestone_id: str) -> str: return f"MILESTONE#{milestone_id}"
    @staticmethod
    def task_sk(task_id: str) -> str: return f"TASK#{task_id}"
    @staticmethod
    def risk_sk(risk_id: str) -> str: return f"RISK#{risk_id}"
    @staticmethod
    def report_sk(created_at: str, report_id: str) -> str: return f"REPORT#{created_at}#{report_id}"
    @staticmethod
    def connector_summary_sk(connector_id: str) -> str: return f"CONNECTOR#{connector_id}"
    @staticmethod
    def connector_config_pk(tenant_id: str, connector_id: str) -> str: return f"TENANT#{tenant_id}#CONNECTOR#{connector_id}"
    @staticmethod
    def connector_config_sk() -> str: return "CONFIG"
    @staticmethod
    def connector_checkpoint_sk(source_id: str) -> str: return f"CHECKPOINT#{source_id}"
    @staticmethod
    def sync_sk(started_at: str, sync_id: str) -> str: return f"SYNC#{started_at}#{sync_id}"
    @staticmethod
    def document_sk(canonical_hash: str) -> str: return f"DOCUMENT#{canonical_hash}"

    @staticmethod
    def task_gsi1(tenant_id: str, user_id: str, due_date: str, status: str, project_id: str, task_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#ASSIGNEE#{user_id}", f"DUE#{due_date}#STATUS#{status}#PROJECT#{project_id}#TASK#{task_id}")
    @staticmethod
    def risk_gsi1(tenant_id: str, owner_id: str, review_date: str, severity: str, project_id: str, risk_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#RISK_OWNER#{owner_id}", f"REVIEW#{review_date}#SEVERITY#{severity}#PROJECT#{project_id}#RISK#{risk_id}")
    @staticmethod
    def project_listing_gsi1(tenant_id: str, program_id: str, status: str, name_normalized: str, project_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#PROGRAM#{program_id}", f"PROJECT#{status}#{name_normalized}#{project_id}")

    @staticmethod
    def task_gsi2(tenant_id: str, project_id: str, status: str, due_date: str, priority: str, task_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#PROJECT#{project_id}#TASK_STATUS#{status}", f"DUE#{due_date}#PRIORITY#{priority}#TASK#{task_id}")
    @staticmethod
    def risk_gsi2(tenant_id: str, project_id: str, status: str, severity_rank: str, review_date: str, risk_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#PROJECT#{project_id}#RISK_STATUS#{status}", f"SEVERITY#{severity_rank}#REVIEW#{review_date}#RISK#{risk_id}")
    @staticmethod
    def connector_gsi2(tenant_id: str, status: str, connector_type: str, connector_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#CONNECTOR_STATUS#{status}", f"TYPE#{connector_type}#CONNECTOR#{connector_id}")

class WorkflowStateKeys:
    @staticmethod
    def workflow_pk(workflow_id: str) -> str: return f"WORKFLOW#{workflow_id}"
    @staticmethod
    def workflow_meta_sk() -> str: return "META"
    @staticmethod
    def workflow_plan_sk(plan_version: int) -> str: return f"PLAN#{plan_version}"
    @staticmethod
    def workflow_task_sk(task_id: str, attempt: int) -> str: return f"TASK#{task_id}#ATTEMPT#{attempt:02d}"
    @staticmethod
    def workflow_event_sk(timestamp: str, event_id: str) -> str: return f"EVENT#{timestamp}#{event_id}"
    @staticmethod
    def workflow_approval_sk(approval_id: str) -> str: return f"APPROVAL#{approval_id}"
    @staticmethod
    def workflow_citation_sk(citation_id: str) -> str: return f"CITATION#{citation_id}"
    @staticmethod
    def workflow_artifact_sk(artifact_id: str) -> str: return f"ARTIFACT#{artifact_id}"
    @staticmethod
    def workflow_message_sk(sequence: int) -> str: return f"MESSAGE#{sequence:06d}"
    @staticmethod
    def idempotency_pk(tenant_id: str, user_id: str, key_hash: str) -> str: return f"IDEMPOTENCY#{tenant_id}#{user_id}#{key_hash}"
    @staticmethod
    def idempotency_sk() -> str: return "REQUEST"
    @staticmethod
    def user_workflow_projection_pk(tenant_id: str, user_id: str) -> str: return f"TENANT#{tenant_id}#USER#{user_id}"
    @staticmethod
    def user_workflow_projection_sk(created_at: str, workflow_id: str) -> str: return f"WORKFLOW#{created_at}#{workflow_id}"
    @staticmethod
    def project_workflow_projection_pk(tenant_id: str, project_id: str) -> str: return f"TENANT#{tenant_id}#PROJECT#{project_id}#WORKFLOWS"
    @staticmethod
    def project_workflow_projection_sk(created_at: str, workflow_id: str) -> str: return f"WORKFLOW#{created_at}#{workflow_id}"
    @staticmethod
    def session_pk(session_id: str) -> str: return f"SESSION#{session_id}"
    @staticmethod
    def session_meta_sk() -> str: return "META"
    @staticmethod
    def session_workflow_sk(created_at: str, workflow_id: str) -> str: return f"CREATED#{created_at}#{workflow_id}"
    @staticmethod
    def workflow_status_gsi1(tenant_id: str, status: str, updated_at: str, workflow_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#WORKFLOW_STATUS#{status}", f"UPDATED#{updated_at}#WORKFLOW#{workflow_id}")
    @staticmethod
    def pending_approval_gsi1(tenant_id: str, confirmer_id: str, expires_at_padded: str, workflow_id: str, approval_id: str) -> tuple[str,str]:
        return (f"TENANT#{tenant_id}#USER#{confirmer_id}#PENDING_APPROVAL", f"EXPIRES#{expires_at_padded}#WORKFLOW#{workflow_id}#APPROVAL#{approval_id}")
