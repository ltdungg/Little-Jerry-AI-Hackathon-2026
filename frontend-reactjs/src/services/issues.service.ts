import * as api from '../lib/api';
import type { Issue, IssueImpact, IssueStatus } from '../types';

/** Same reasoning as tasks.service.ts: the real backend scopes issues by
 * project_id, but public function signatures stay id-only to match the
 * original mock API, so we cache project_id from the last list call. */
const projectIdByIssueId = new Map<string, string>();

function mapIssue(i: any): Issue {
  projectIdByIssueId.set(i.issue_id, i.project_id);
  return {
    id: i.issue_id,
    title: i.title,
    description: i.description || '',
    programId: i.project_id,
    programName: i.project_id,
    reporterName: i.reporter_name || '',
    ownerId: i.owner_id ?? null,
    ownerName: i.owner_name ?? null,
    detectedAt: i.detected_at || '',
    dueDate: i.due_date ?? null,
    impact: i.impact,
    status: i.status,
    source: i.source,
    aiEvidence: i.ai_evidence
      ? { snippet: i.ai_evidence.snippet, source: i.ai_evidence.source }
      : undefined,
    resolutionPlan: i.resolution_plan || '',
  };
}

function requireProjectId(issueId: string): string {
  const projectId = projectIdByIssueId.get(issueId);
  if (!projectId) {
    throw new Error(`Không xác định được chương trình của khó khăn ${issueId}. Hãy tải lại danh sách.`);
  }
  return projectId;
}

async function withProjectNames(issues: any[]): Promise<Issue[]> {
  const projectNames = await api.getProjectNameMap();
  return issues.map((i) => ({ ...mapIssue(i), programName: projectNames[i.project_id] || i.project_id }));
}

export interface ListIssuesParams {
  status?: IssueStatus | 'all';
  impact?: IssueImpact | 'all';
  source?: 'manual' | 'ai_suggested' | 'all';
  programId?: string;
}

export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  const raw = await api.getIssues({
    status: params.status && params.status !== 'all' ? params.status : undefined,
    impact: params.impact && params.impact !== 'all' ? params.impact : undefined,
    source: params.source && params.source !== 'all' ? params.source : undefined,
    project_id: params.programId,
  });
  return withProjectNames(raw);
}

export async function confirmAiIssue(id: string, ownerName: string): Promise<Issue> {
  const raw = await api.updateIssue(requireProjectId(id), id, {
    source: 'manual',
    status: 'investigating',
    owner_name: ownerName,
  });
  return (await withProjectNames([raw]))[0];
}

export async function dismissAiIssue(id: string): Promise<void> {
  await api.dismissIssue(requireProjectId(id), id);
}

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<Issue> {
  const raw = await api.updateIssue(requireProjectId(id), id, { status });
  return (await withProjectNames([raw]))[0];
}

export async function updateIssueOwner(id: string, ownerName: string): Promise<Issue> {
  const raw = await api.updateIssue(requireProjectId(id), id, { owner_name: ownerName });
  return (await withProjectNames([raw]))[0];
}

export function issueImpactLabel(impact: IssueImpact): string {
  return { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Nghiêm trọng' }[impact];
}

export function issueStatusLabel(status: IssueStatus): string {
  return {
    new: 'Mới ghi nhận',
    investigating: 'Đang tìm hiểu',
    in_progress: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng',
  }[status];
}
