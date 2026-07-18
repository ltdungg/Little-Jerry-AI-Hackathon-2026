export type Role =
  | 'leadership'
  | 'coordinator'
  | 'team_lead'
  | 'staff'
  | 'volunteer'
  | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  team: string;
  initials: string;
}

export type ProjectStatus = 'healthy' | 'at_risk' | 'overdue';

export interface Project {
  id: string;
  name: string;
  program: string;
  status: ProjectStatus;
  owner: string;
  ownerInitials: string;
  nextMilestone: string;
  overdueCount: number;
  highRiskCount: number;
  progress: number;
  team: string;
  updatedAt: string;
}

export type SourceType = 'SharePoint' | 'Slack' | 'Meeting' | 'Docs';

export interface Citation {
  id: string;
  title: string;
  snippet: string;
  source: SourceType;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  synthesizedFrom?: number;
  sources?: SourceType[];
  citations?: Citation[];
}

export interface NavLeaf {
  label: string;
  path: string;
  icon: string;
  blurb: string;
  features: string[];
  badge?: 'new' | 'progress';
}

export interface NavGroup {
  label: string;
  icon: string;
  items: NavLeaf[];
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export interface TaskComment {
  id: string;
  author: string;
  authorInitials: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  programId: string;
  programName: string;
  teamId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  dependsOnTaskIds: string[];
  comments: TaskComment[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Weekly updates
// ---------------------------------------------------------------------------

export type UpdateStatus = 'draft' | 'submitted';

export interface WeeklyUpdate {
  id: string;
  userId: string;
  userName: string;
  week: string;
  programIds: string[];
  doneItems: string[];
  inProgressItems: string[];
  issues: string;
  nextSteps: string;
  supportNeeded: string;
  status: UpdateStatus;
  submittedAt: string | null;
}

export interface TeamMemberSubmission {
  userId: string;
  userName: string;
  userInitials: string;
  submitted: boolean;
}

export type TeamReportStatus = 'draft' | 'approved' | 'published';

export interface TeamWeeklyReport {
  id: string;
  teamId: string;
  teamName: string;
  week: string;
  memberSubmissions: TeamMemberSubmission[];
  highlights: string[];
  issues: string[];
  nextPriorities: string[];
  status: TeamReportStatus;
}

// ---------------------------------------------------------------------------
// Daily updates (cập nhật tiến độ task hằng ngày, theo dự án)
// ---------------------------------------------------------------------------

export interface DailyTaskProgress {
  taskId: string;
  taskTitle: string;
  statusBefore: TaskStatus;
  statusAfter: TaskStatus;
  note?: string;
}

export interface DailyUpdate {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  date: string;
  programId: string;
  taskUpdates: DailyTaskProgress[];
  status: UpdateStatus;
}

// ---------------------------------------------------------------------------
// Project reports (báo cáo ngày/tuần do AgentCore sinh, chỉnh sửa được, xuất PDF)
// ---------------------------------------------------------------------------

export type ProjectReportType = 'daily_status' | 'weekly_status';
export type ProjectReportStatus = 'generating' | 'draft' | 'edited' | 'exported' | 'failed';
export type ProjectReportTrigger = 'manual' | 'schedule';

export interface ProjectReport {
  id: string;
  projectId: string;
  reportType: ProjectReportType;
  periodLabel: string;
  status: ProjectReportStatus;
  generatedBy: ProjectReportTrigger;
  contentMarkdown: string;
  isEdited: boolean;
  editedAt: string | null;
  pdfExportedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'issue_new'
  | 'issue_escalated'
  | 'decision_pending'
  | 'decision_confirmed'
  | 'update_due_soon'
  | 'update_missing'
  | 'document_updated'
  | 'handoff_pending';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link: string;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export type IssueImpact = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'new' | 'investigating' | 'in_progress' | 'resolved' | 'closed';
export type IssueSource = 'manual' | 'ai_suggested';

export interface Issue {
  id: string;
  title: string;
  description: string;
  programId: string;
  programName: string;
  reporterName: string;
  ownerId: string | null;
  ownerName: string | null;
  detectedAt: string;
  dueDate: string | null;
  impact: IssueImpact;
  status: IssueStatus;
  source: IssueSource;
  aiEvidence?: { snippet: string; source: SourceType };
  resolutionPlan: string;
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export type DecisionApprovalStatus =
  | 'ai_suggested'
  | 'draft'
  | 'reviewing'
  | 'confirmed'
  | 'rejected';
export type DecisionEffectiveStatus = 'active' | 'superseded' | 'archived';

export interface Decision {
  id: string;
  title: string;
  content: string;
  programId: string;
  programName: string;
  decidedAt: string;
  ownerName: string;
  approverName: string | null;
  participants: string[];
  reason: string;
  alternativesConsidered: string[];
  expectedImpact: string;
  followUpTasks: string[];
  approvalStatus: DecisionApprovalStatus;
  effectiveStatus: DecisionEffectiveStatus;
  supersededByTitle: string | null;
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export type ActionItemStatus = 'proposed' | 'confirmed' | 'rejected';

export interface MeetingActionItem {
  id: string;
  title: string;
  owner: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  participants: string[];
  teamId: string;
  programName: string;
  summary: string;
  keyTopics: string[];
  proposedDecisions: string[];
  actionItems: MeetingActionItem[];
  openQuestions: string[];
}

// ---------------------------------------------------------------------------
// Teams & members
// ---------------------------------------------------------------------------

export interface TeamMemberRef {
  id: string;
  name: string;
  initials: string;
  roleLabel: string;
}

export interface Team {
  id: string;
  name: string;
  mission: string;
  programNames: string[];
  members: TeamMemberRef[];
  status: 'active' | 'needs_support';
  lastReportAt: string;
}

export type MemberKind = 'staff' | 'volunteer';
export type MemberStatus = 'active' | 'ending_soon' | 'inactive';

export interface MemberRecord {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  roleLabel: string;
  teamName: string;
  programNames: string[];
  kind: MemberKind;
  status: MemberStatus;
  startDate: string;
  endDate: string | null;
  managerId?: string;
}

// ---------------------------------------------------------------------------
// Knowledge / documents
// ---------------------------------------------------------------------------

export type DocumentStatus = 'active' | 'draft' | 'maybe_outdated' | 'archived' | 'replaced';
export type DocumentKind = 'policy' | 'report' | 'guide' | 'template' | 'meeting_notes';

export interface KnowledgeDocument {
  id: string;
  title: string;
  teamName: string;
  programName: string | null;
  kind: DocumentKind;
  owner: string;
  updatedAt: string;
  source: SourceType;
  version: string;
  status: DocumentStatus;
  aiFlag: 'duplicate' | 'conflicting' | 'stale' | null;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export type ActivityAction =
  | 'viewed'
  | 'edited'
  | 'approved'
  | 'rejected'
  | 'exported'
  | 'shared'
  | 'permission_changed'
  | 'ai_generated'
  | 'account_locked';

export interface ActivityLogEntry {
  id: string;
  actorName: string;
  action: ActivityAction;
  target: string;
  timestamp: string;
  aiSourceUsed: string | null;
}

// ---------------------------------------------------------------------------
// Assistant: chat history & saved answers
// ---------------------------------------------------------------------------

export interface ChatSession {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  savedAt: string;
  savedBy: string;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface OnboardingContent {
  teamName: string;
  teamIntro: string;
  programIntro: string;
  contacts: { name: string; roleLabel: string; initials: string }[];
  currentPriorities: string[];
  keyDecisions: string[];
  openTasks: string[];
  requiredDocs: string[];
  faqs: { question: string; answer: string }[];
  glossary: { term: string; definition: string }[];
  checklist: OnboardingChecklistItem[];
}

// ---------------------------------------------------------------------------
// Handoff / offboarding
// ---------------------------------------------------------------------------

export type HandoffStatus = 'draft' | 'team_lead_review' | 'receiver_confirm' | 'complete';

export interface Handoff {
  id: string;
  fromName: string;
  toName: string | null;
  teamName: string;
  programName: string;
  currentResponsibilities: string;
  inProgressWork: string;
  pendingDecisions: string;
  unresolvedIssues: string;
  keyContacts: string;
  relatedDocs: string;
  risks: string;
  nextSteps: string;
  status: HandoffStatus;
}

export interface OffboardingRecord {
  id: string;
  name: string;
  initials: string;
  teamName: string;
  accessEndsAt: string;
  accessToRevoke: string[];
  ownedDocuments: string[];
  handoffComplete: boolean;
}

// ---------------------------------------------------------------------------
// Admin: users & roles
// ---------------------------------------------------------------------------

export type UserAccountStatus = 'active' | 'locked';

export interface UserAccount {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  roleLabel: string;
  teamName: string;
  kind: MemberKind;
  status: UserAccountStatus;
  startDate: string;
  endDate: string | null;
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'approve' | 'export' | 'share';

export interface RolePermissionRow {
  role: Role;
  roleLabel: string;
  permissions: Record<PermissionAction, boolean>;
}
