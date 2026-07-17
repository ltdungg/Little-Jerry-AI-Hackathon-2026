# Mock Data — NPO AI Platform

Tổng hợp mock data cho NPO AI Platform, dựa trên data model và code hiện tại.

## Cấu trúc thư mục

```
mock-data/
├── api/                          # API view models và request context
│   ├── request-context.json      # RequestContext (server-side, verified identity)
│   ├── current-user-view.json    # CurrentUserView
│   ├── project-summary-view.json # ProjectSummaryView
│   ├── task-view.json            # TaskView
│   ├── workflow-view.json        # WorkflowView
│   ├── connector-safe-view.json  # ConnectorSafeView (không có secrets)
│   ├── error-responses.json      # Error model examples
│   └── domain-events.json        # DomainEvent envelope (audit trail)
│
├── dynamodb/
│   ├── business-data/            # BusinessData table items
│   │   ├── 01-tenants.json       # Tenant records (2 tenants)
│   │   ├── 02-programs.json      # Program records (2 programs)
│   │   ├── 03-user-profiles.json # UserProfile records (4 users)
│   │   ├── 04-memberships.json   # TenantMembership records (4 memberships)
│   │   ├── 05-projects.json      # Project records (3 projects)
│   │   ├── 06-project-members.json # ProjectMember records
│   │   ├── 07-milestones.json    # Milestone records (4 milestones)
│   │   ├── 08-tasks.json         # Task records (12 tasks, various statuses)
│   │   ├── 08b-tasks-gsi-projections.json # Task GSI1/GSI2 projections
│   │   ├── 09-risks.json         # Risk records (5 risks, various severities)
│   │   ├── 10-reports.json       # Report metadata (3 reports: 2 complete, 1 partial)
│   │   ├── 11-connectors.json    # Connector configs, checkpoints (3 connectors)
│   │   ├── 12-sync-executions.json # Sync execution records (3 executions)
│   │   └── 13-source-documents.json # Source document metadata (4 docs, 1 quarantined)
│   │
│   └── workflow-state/           # WorkflowState table items
│       ├── 01-workflow-metadata.json  # Workflow records (5 workflows: running, waiting, completed, failed)
│       ├── 02-agent-tasks.json        # AgentTask attempt records
│       ├── 03-workflow-events.json    # WorkflowEvent records
│       ├── 04-approvals.json          # Approval records (pending + expired)
│       └── 05-idempotency-sessions.json # Idempotency, session, projections
│
├── s3/
│   ├── raw/                      # Raw S3 payloads (Slack, SharePoint)
│   │   ├── slack-channel-general.json
│   │   ├── sharepoint-procurement-policy.json
│   │   └── sharepoint-budget-report.json
│   ├── curated/                  # Curated documents + metadata sidecar
│   │   └── ten_01JABCDEF001/
│   │       └── prj_01JGREEN01/
│   │           ├── sharepoint/   # SharePoint curated docs
│   │           │   ├── doc_01JPROCO01.txt
│   │           │   ├── doc_01JPROCO01.metadata.json
│   │           │   ├── doc_01JBUDG001.txt
│   │           │   └── doc_01JBUDG001.metadata.json
│   │           └── slack/        # Slack curated docs
│   │               ├── doc_01JSLAC001.txt
│   │               └── doc_01JSLAC001.metadata.json
│   └── artifact/                 # Generated reports
│       ├── weekly-report-w27.md
│       └── weekly-report-w28.md
│
├── slack/                        # Slack API responses (channel data)
│   ├── channel-general.json
│   ├── channel-projects.json
│   └── channel-logistics.json
│
├── sharepoint/                   # SharePoint API responses
│   └── site-documents.json
│
├── google-drive/                 # Google Drive API responses
│   └── drive-documents.json
│
├── connectors/                   # Connector configurations
│   (đãรวม trong business-data/11-connectors.json)
│
├── workflows/                    # Workflow execution data
│   (đãรวม trong workflow-state/)
│
├── agent-results/                # AgentTaskResult payloads
│   ├── knowledge-search-result.json
│   ├── report-generation-result.json
│   └── task-change-proposal.json
│
├── knowledge-base/               # Knowledge Base filter và results
│   ├── retrieval-filter.json
│   └── retrieval-results.json
│
└── README.md                     # File này
```

## Tenant/Project mapping

| Tenant | Tenant ID | Projects |
|--------|-----------|----------|
| Green Hope Foundation | `ten_01JABCDEF001` | Green Hope, Ocean Rescue, Community Health |
| Ocean Rescue Alliance | `ten_01JABCDEF002` | (isolated tenant — used for cross-tenant isolation testing) |

## Users

| User | Tenant | Role | Projects |
|------|--------|------|----------|
| Minh Nguyen | Green Hope | project_manager | Green Hope (PM), Ocean Rescue, Community Health |
| Sarah Pham | Green Hope | npo_staff | Green Hope, Ocean Rescue (PM) |
| John Doe | Green Hope | program_director | Green Hope, Community Health (PM) |
| Lina Le | Ocean Rescue | npo_staff | (Ocean Rescue only) |

## Task status distribution (12 tasks)

| Status | Count | Task IDs |
|--------|-------|----------|
| todo | 2 | tsk_01JSEED005, tsk_01JSEED008 |
| in_progress | 4 | tsk_01JSEED002, tsk_01JSEED003, tsk_01JSEED006, tsk_01JCLEA001 |
| blocked | 1 | tsk_01JSEED004 |
| done | 2 | tsk_01JSEED001, tsk_01JSEED007 |
| cancelled | 1 | tsk_01JSEED010 |
| overdue (derived) | 1 | tsk_01JSEED004 (due 2026-07-10, status: blocked) |

## Risk severity distribution (5 risks)

| Severity | Score | Count | Risk IDs |
|----------|-------|-------|----------|
| high | 12–16 | 3 | rsk_01JSUPP001 (16), rsk_01JWEAT001 (12), rsk_01JFUND001 (12) |
| medium | 5–9 | 2 | rsk_01JBUDG001 (9), rsk_01JVOLU001 (8) |

## Workflow states (5 workflows)

| Status | Count | Workflow IDs |
|--------|-------|--------------|
| completed | 2 | wf_01JWKLY001, wf_01JWKLY002 |
| waiting_for_user | 1 | wf_01JGRNT001 |
| running | 1 | wf_01JCOMM001 |
| failed | 1 | wf_01JKNOW001 |

## Connector states (3 connectors)

| Type | Status | Connector ID |
|------|--------|--------------|
| Slack | healthy | con_01JSLACK001 |
| SharePoint | healthy | con_01JSP000001 |
| Google Drive | degraded | con_01JGDRV001 |

## Test fixtures có sẵn

Dữ liệu trong `mock-data/` bao gồm:
- Prompt injection attempt trong Slack (`channel-general.json`)
- Cross-tenant isolation data (user-lina trong tenant khác)
- Quarantined document (prompt injection detected)
- Expired approval record
- Failed workflow (timeout)
- Overdue task (tsk_01JSEED004)
- Concurrent version conflict scenarios (task version 5)
- Confidential classification (budget report)
- Idempotency duplicate detection
- Multi-connector ingestion (Slack + SharePoint + Google Drive)
- Optimistic concurrency (version field tracking)
- GSI projections cho access patterns B09, B10, B11
