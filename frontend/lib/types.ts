export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "archived"
export type Health = "green" | "amber" | "red" | "unknown"
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled"
export type Priority = "low" | "medium" | "high" | "critical"
export type RiskStatus = "open" | "mitigating" | "accepted" | "closed"
export type MilestoneStatus = "not_started" | "in_progress" | "blocked" | "completed" | "cancelled"
export type UserRole = "npo_staff" | "project_manager" | "program_director" | "knowledge_admin" | "platform_admin" | "auditor"

export interface UserProfile {
  user_id: string
  display_name: string
  email: string
  roles: UserRole[]
  capabilities: string[]
}

export interface Project {
  project_id: string
  name: string
  program_name: string
  description: string
  status: ProjectStatus
  health: Health
  manager: { user_id: string; display_name: string }
  next_milestone?: { name: string; target_date: string }
  overdue_task_count: number
  high_risk_count: number
  start_date: string
  end_date: string
  tags: string[]
  updated_at: string
}

export interface Task {
  task_id: string
  project_id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignee: { user_id: string; display_name: string }
  due_date: string
  is_overdue: boolean
  milestone?: { milestone_id: string; name: string }
  related_risks: { risk_id: string; title: string; severity: string }[]
  version: number
  updated_at: string
  allowed_actions: string[]
}

export interface Risk {
  risk_id: string
  project_id: string
  title: string
  description: string
  status: RiskStatus
  category: string
  likelihood: number
  impact: number
  score: number
  severity: string
  owner: { user_id: string; display_name: string }
  mitigation: string
  review_date: string
}

export interface Milestone {
  milestone_id: string
  name: string
  description: string
  status: MilestoneStatus
  health: Health
  target_date: string
  completed_at: string | null
  owner: { user_id: string; display_name: string }
}

export interface Citation {
  citation_id: string
  source_system: string
  document_id: string
  document_title: string
  source_uri: string
  page_or_section?: string
  excerpt: string
  last_modified_at?: string
}

export interface Artifact {
  artifact_id: string
  artifact_type: string
  title: string
  s3_uri: string
  created_at: string
}

export interface Workflow {
  workflow_id: string
  status: string
  request_summary: string
  project?: { project_id: string; name: string }
  current_phase: string
  requires_user_action: boolean
  progress: { completed: number; total: number }
  events: WorkflowEvent[]
  citations: Citation[]
  artifacts: Artifact[]
  approval?: Approval
  warnings: string[]
  retryable: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowEvent {
  event_type: string
  public_message: string
  actor_type: string
  created_at: string
}

export interface Approval {
  approval_id: string
  action_type: string
  action_preview: Record<string, unknown>
  status: string
  expires_at: string
}

export interface ChatResponse {
  workflow_id: string
  status: string
  answer?: string
  citations: Citation[]
  artifacts: Artifact[]
  approval?: Approval
}

export interface ProjectMember {
  user_id: string
  display_name: string
  project_role: string
}
