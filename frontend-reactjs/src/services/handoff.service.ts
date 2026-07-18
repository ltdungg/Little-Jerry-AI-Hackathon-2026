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
    fromName: h.from_name || '',
    toName: h.to_name ?? null,
    teamName: h.team_name || '',
    programName: h.program_name || '',
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
  const raw = await api.updateHandoff(id, status);
  return mapHandoff(raw);
}

export async function listOffboardingRecords(): Promise<OffboardingRecord[]> {
  const raw = await api.getOffboardingRecords();
  return raw.map(mapOffboarding);
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
