import { delay } from './mockClient';
import type { DocumentKind, DocumentStatus, KnowledgeDocument } from '../types';

let documents: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: 'Q3_Status_Report.docx',
    teamName: 'Education',
    programName: 'Rural Education',
    kind: 'report',
    owner: 'Marcus Tran',
    updatedAt: '3 ngày trước',
    source: 'SharePoint',
    version: 'v3',
    status: 'active',
    aiFlag: null,
  },
  {
    id: 'doc-2',
    title: 'Quy trình an toàn công trường',
    teamName: 'Education',
    programName: 'Rural Education',
    kind: 'policy',
    owner: 'Marcus Tran',
    updatedAt: '4 ngày trước',
    source: 'Docs',
    version: 'v2',
    status: 'active',
    aiFlag: null,
  },
  {
    id: 'doc-3',
    title: 'Decision D-2024-014.md',
    teamName: 'Health & WASH',
    programName: 'Clean Water Access',
    kind: 'report',
    owner: 'Priya Nair',
    updatedAt: '2 tuần trước',
    source: 'Docs',
    version: 'v1',
    status: 'active',
    aiFlag: null,
  },
  {
    id: 'doc-4',
    title: 'Mẫu bàn giao dự án (2023)',
    teamName: 'Tech for Good',
    programName: null,
    kind: 'template',
    owner: 'Elena Lopez',
    updatedAt: '8 tháng trước',
    source: 'SharePoint',
    version: 'v1',
    status: 'maybe_outdated',
    aiFlag: 'stale',
  },
  {
    id: 'doc-5',
    title: 'Hướng dẫn tuyển dụng tình nguyện viên',
    teamName: 'Education',
    programName: null,
    kind: 'guide',
    owner: 'Sarah Johnson',
    updatedAt: '1 tháng trước',
    source: 'Docs',
    version: 'v4',
    status: 'active',
    aiFlag: null,
  },
  {
    id: 'doc-6',
    title: 'Biên bản họp giao ban tuần — Education (bản nháp)',
    teamName: 'Education',
    programName: 'Rural Education',
    kind: 'meeting_notes',
    owner: 'Sarah Johnson',
    updatedAt: '2 ngày trước',
    source: 'Meeting',
    version: 'v1',
    status: 'draft',
    aiFlag: null,
  },
  {
    id: 'doc-7',
    title: 'Ngân sách chương trình vi tín dụng — bản cũ',
    teamName: 'Economic Empowerment',
    programName: 'Women Microfinance Circles',
    kind: 'report',
    owner: 'Grace Owusu',
    updatedAt: '5 tháng trước',
    source: 'SharePoint',
    version: 'v2',
    status: 'replaced',
    aiFlag: 'duplicate',
  },
];

export interface ListDocumentsParams {
  status?: DocumentStatus | 'all';
  kind?: DocumentKind | 'all';
  teamName?: string;
}

export async function listDocuments(params: ListDocumentsParams = {}): Promise<KnowledgeDocument[]> {
  let result = documents;
  if (params.status && params.status !== 'all') result = result.filter((d) => d.status === params.status);
  if (params.kind && params.kind !== 'all') result = result.filter((d) => d.kind === params.kind);
  if (params.teamName) result = result.filter((d) => d.teamName === params.teamName);
  return delay([...result]);
}

export async function markDocumentOutdated(id: string): Promise<KnowledgeDocument> {
  documents = documents.map((d) => (d.id === id ? { ...d, status: 'maybe_outdated' as const } : d));
  return delay(documents.find((d) => d.id === id)!);
}

export async function assignDocumentOwner(id: string, owner: string): Promise<KnowledgeDocument> {
  documents = documents.map((d) => (d.id === id ? { ...d, owner } : d));
  return delay(documents.find((d) => d.id === id)!);
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
