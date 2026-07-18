import * as api from '../lib/api';
import type { DocumentKind, DocumentStatus, KnowledgeDocument } from '../types';

function mapDocument(d: any): KnowledgeDocument {
  return {
    id: d.document_id,
    title: d.title,
    teamName: d.team_name || '',
    programName: d.program_name ?? null,
    kind: d.kind,
    owner: d.owner || '',
    updatedAt: d.updated_at || '',
    source: d.source,
    version: d.version || 'v1',
    status: d.status,
    aiFlag: d.ai_flag ?? null,
  };
}

export interface ListDocumentsParams {
  status?: DocumentStatus | 'all';
  kind?: DocumentKind | 'all';
  teamName?: string;
}

export async function listDocuments(params: ListDocumentsParams = {}): Promise<KnowledgeDocument[]> {
  const raw = await api.getDocuments({
    status: params.status && params.status !== 'all' ? params.status : undefined,
    kind: params.kind && params.kind !== 'all' ? params.kind : undefined,
    team_name: params.teamName,
  });
  return raw.map(mapDocument);
}

export async function markDocumentOutdated(id: string): Promise<KnowledgeDocument> {
  const raw = await api.updateDocument(id, { status: 'maybe_outdated' });
  return mapDocument(raw);
}

export async function assignDocumentOwner(id: string, owner: string): Promise<KnowledgeDocument> {
  const raw = await api.updateDocument(id, { owner });
  return mapDocument(raw);
}

export function documentStatusLabel(status: DocumentStatus): string {
  return {
    active: 'Đang sử dụng',
    draft: 'Bản nháp',
    maybe_outdated: 'Có thể đã cũ',
    archived: 'Đã lưu trữ',
    replaced: 'Đã được thay thế',
  }[status];
}

export function documentKindLabel(kind: DocumentKind): string {
  return {
    policy: 'Quy định',
    report: 'Báo cáo',
    guide: 'Hướng dẫn',
    template: 'Mẫu tài liệu',
    meeting_notes: 'Biên bản họp',
  }[kind];
}
