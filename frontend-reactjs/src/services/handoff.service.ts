import * as api from '../lib/api';
import type { Handoff, HandoffStatus, HandoffTask, HandoffDocument, OffboardingRecord } from '../types';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapHandoff(h: any): Handoff {
  return {
    id: h.handoff_id,
    fromUserId: h.from_user_id || '',
    fromName: h.from_name || '',
    toUserId: h.to_user_id ?? null,
    toName: h.to_name ?? null,
    teamName: h.team_name || '',
    projectId: h.project_id || '',
    programName: h.program_name || '',
    deadline: h.deadline ?? null,
    currentResponsibilities: h.current_responsibilities || '',
    inProgressWork: h.in_progress_work || '',
    pendingDecisions: h.pending_decisions || '',
    unresolvedIssues: h.unresolved_issues || '',
    keyContacts: h.key_contacts || '',
    relatedDocs: h.related_docs || '',
    risks: h.risks || '',
    nextSteps: h.next_steps || '',
    status: h.status,
    tasks: (h.tasks || []).map((t: any): HandoffTask => ({
      id: t.task_id || t.id || '',
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'pending',
      assigneeName: t.assignee_name ?? null,
      dueDate: t.due_date ?? null,
    })),
    documents: (h.documents || []).map((d: any): HandoffDocument => ({
      name: d.name || '',
      url: d.url || '#',
      type: d.type || 'doc',
    })),
    context: h.context || '',
    reviewComments: h.review_comments ?? null,
    reviewerName: h.reviewer_name ?? null,
    reviewedAt: h.reviewed_at ?? null,
  };
}

function mapOffboarding(o: any): OffboardingRecord {
  return {
    id: o.offboarding_id,
    userId: o.user_id || '',
    name: o.name || '',
    initials: initialsOf(o.name || ''),
    teamName: o.team_name || '',
    accessEndsAt: o.access_ends_at || '',
    accessToRevoke: o.access_to_revoke || [],
    ownedDocuments: o.owned_documents || [],
    handoffComplete: o.handoff_complete || false,
  };
}

export interface ListHandoffsParams {
  /** Backend has no server-side filter for this yet — matched client-side
   * against `program_name`, which the real data stores as the project's
   * display name (see Meeting/Handoff seed fixtures). */
  programName?: string;
}

export async function listHandoffs(params: ListHandoffsParams = {}): Promise<Handoff[]> {
  const raw = await api.getHandoffs();
  const items = raw.map(mapHandoff);
  return params.programName ? items.filter((h) => h.programName === params.programName) : items;
}

export async function updateHandoffStatus(id: string, status: HandoffStatus): Promise<Handoff> {
  const raw = await api.updateHandoff(id, { status });
  return mapHandoff(raw);
}

export interface HandoffContentUpdate {
  currentResponsibilities?: string;
  inProgressWork?: string;
  pendingDecisions?: string;
  unresolvedIssues?: string;
  keyContacts?: string;
  relatedDocs?: string;
  risks?: string;
  nextSteps?: string;
  context?: string;
  deadline?: string | null;
}

/** Persists the editable body of a handoff — replaces the previous
 * local-state-only "save" behavior in HandoffDetailPage.tsx. */
export async function updateHandoffContent(id: string, fields: HandoffContentUpdate): Promise<Handoff> {
  const body: Record<string, unknown> = {};
  if (fields.currentResponsibilities !== undefined) body.current_responsibilities = fields.currentResponsibilities;
  if (fields.inProgressWork !== undefined) body.in_progress_work = fields.inProgressWork;
  if (fields.pendingDecisions !== undefined) body.pending_decisions = fields.pendingDecisions;
  if (fields.unresolvedIssues !== undefined) body.unresolved_issues = fields.unresolvedIssues;
  if (fields.keyContacts !== undefined) body.key_contacts = fields.keyContacts;
  if (fields.relatedDocs !== undefined) body.related_docs = fields.relatedDocs;
  if (fields.risks !== undefined) body.risks = fields.risks;
  if (fields.nextSteps !== undefined) body.next_steps = fields.nextSteps;
  if (fields.context !== undefined) body.context = fields.context;
  if (fields.deadline !== undefined) body.deadline = fields.deadline;
  const raw = await api.updateHandoff(id, body);
  return mapHandoff(raw);
}

/** Người nghỉ chọn người nhận khi còn bản nháp; PM/lãnh đạo có thể đổi lại
 * bất kỳ lúc nào trước khi hoàn tất (backend tự áp quy tắc quyền). */
export async function reassignReceiver(id: string, toUserId: string | null, toName: string | null): Promise<Handoff> {
  const raw = await api.updateHandoff(id, { to_user_id: toUserId, to_name: toName });
  return mapHandoff(raw);
}

export async function regenerateHandoffContext(id: string): Promise<Handoff> {
  const raw = await api.regenerateHandoffContext(id);
  return mapHandoff(raw);
}

export async function listOffboardingRecords(): Promise<OffboardingRecord[]> {
  const raw = await api.getOffboardingRecords();
  return raw.map(mapOffboarding);
}

/** PM/lãnh đạo bắt đầu quy trình nghỉ việc — backend tự tạo 1 bàn giao cho
 * mỗi dự án người này tham gia, mỗi cái đã có sẵn nội dung do AI tổng hợp. */
export async function createOffboarding(
  userId: string,
  accessEndsAt: string,
): Promise<{ offboarding: OffboardingRecord; handoffs: Handoff[] }> {
  const raw = await api.createOffboarding({ user_id: userId, access_ends_at: accessEndsAt });
  return {
    offboarding: mapOffboarding(raw.offboarding),
    handoffs: (raw.handoffs || []).map(mapHandoff),
  };
}

export async function confirmHandoffComplete(id: string): Promise<OffboardingRecord> {
  const raw = await api.confirmOffboardingHandoff(id);
  return mapOffboarding(raw);
}

export function handoffStatusLabel(status: HandoffStatus): string {
  return {
    draft: 'Bản nháp',
    team_lead_review: 'Trưởng nhóm kiểm tra',
    receiver_confirm: 'Chờ người tiếp nhận xác nhận',
    complete: 'Hoàn tất',
  }[status];
}
