import * as api from '../lib/api';
import type { Decision, DecisionApprovalStatus } from '../types';

/** Same reasoning as tasks.service.ts / issues.service.ts: cache project_id
 * from the last list call so mutate-by-id signatures can stay unchanged. */
const projectIdByDecisionId = new Map<string, string>();

function mapDecision(d: any, projectNames: Record<string, string>): Decision {
  projectIdByDecisionId.set(d.decision_id, d.project_id);
  return {
    id: d.decision_id,
    title: d.title,
    content: d.content || '',
    programId: d.project_id,
    programName: projectNames[d.project_id] || d.project_id,
    decidedAt: d.decided_at || 'Chưa xác định',
    ownerName: d.owner_name || '',
    approverName: d.approver_name ?? null,
    participants: d.participants || [],
    reason: d.reason || '',
    alternativesConsidered: d.alternatives_considered || [],
    expectedImpact: d.expected_impact || '',
    followUpTasks: d.follow_up_tasks || [],
    approvalStatus: d.approval_status,
    effectiveStatus: d.effective_status,
    supersededByTitle: d.superseded_by_title ?? null,
  };
}

function requireProjectId(decisionId: string): string {
  const projectId = projectIdByDecisionId.get(decisionId);
  if (!projectId) {
    throw new Error(`Không xác định được chương trình của quyết định ${decisionId}. Hãy tải lại danh sách.`);
  }
  return projectId;
}

export interface ListDecisionsParams {
  approvalStatus?: DecisionApprovalStatus | 'all';
  programId?: string;
  onlyConfirmed?: boolean;
}

export async function listDecisions(params: ListDecisionsParams = {}): Promise<Decision[]> {
  const [raw, projectNames] = await Promise.all([
    api.getDecisions({
      approval_status: params.approvalStatus && params.approvalStatus !== 'all' ? params.approvalStatus : undefined,
      project_id: params.programId,
      only_confirmed: params.onlyConfirmed,
    }),
    api.getProjectNameMap(),
  ]);
  return raw.map((d) => mapDecision(d, projectNames));
}

export async function approveDecision(id: string, approverName: string): Promise<Decision> {
  const [raw, projectNames] = await Promise.all([
    api.updateDecision(requireProjectId(id), id, { approval_status: 'confirmed', approver_name: approverName }),
    api.getProjectNameMap(),
  ]);
  return mapDecision(raw, projectNames);
}

export async function rejectDecision(id: string): Promise<Decision> {
  const [raw, projectNames] = await Promise.all([
    api.updateDecision(requireProjectId(id), id, { approval_status: 'rejected' }),
    api.getProjectNameMap(),
  ]);
  return mapDecision(raw, projectNames);
}

export function decisionApprovalLabel(status: DecisionApprovalStatus): string {
  return {
    ai_suggested: 'AI đề xuất',
    draft: 'Bản nháp',
    reviewing: 'Đang xem xét',
    confirmed: 'Đã xác nhận',
    rejected: 'Bị từ chối',
  }[status];
}
