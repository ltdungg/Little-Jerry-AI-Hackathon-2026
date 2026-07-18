import * as api from '../lib/api';
import type { ProjectReport, ProjectReportType } from '../types';

function mapReport(r: any): ProjectReport {
  return {
    id: r.report_id,
    projectId: r.project_id,
    reportType: r.report_type,
    periodLabel: r.period_start === r.period_end ? r.period_start : `${r.period_start} → ${r.period_end}`,
    status: r.status,
    generatedBy: r.category === 'manual' ? 'manual' : 'schedule',
    contentMarkdown: r.content || '',
    isEdited: r.status === 'edited' || (r.status === 'exported' && !!r.edited_at),
    editedAt: r.edited_at,
    pdfExportedAt: r.exported_at,
    createdAt: r.generated_at || '',
  };
}

export async function listProjectReports(projectId: string): Promise<ProjectReport[]> {
  const raw = await api.getProjectReports(projectId);
  return raw.map(mapReport);
}

/** For the `/reports/weekly` rollup page: latest weekly report per project_id. */
export async function listAllWeeklyReports(): Promise<Record<string, ProjectReport>> {
  const raw = await api.getAllReports({ category: 'weekly' });
  const byProject: Record<string, ProjectReport> = {};
  for (const r of raw) {
    // Each project's own list is newest-first, so the first hit per project_id wins.
    if (!byProject[r.project_id]) byProject[r.project_id] = mapReport(r);
  }
  return byProject;
}

export async function generateReports(projectId: string, types: ProjectReportType[]): Promise<ProjectReport[]> {
  const created = await Promise.all(types.map((type) => api.createReport(projectId, type)));
  return created.map(mapReport);
}

export async function getReport(reportId: string): Promise<ProjectReport | undefined> {
  try {
    return mapReport(await api.getReport(reportId));
  } catch {
    return undefined;
  }
}

export async function updateReportContent(reportId: string, content: string): Promise<ProjectReport> {
  return mapReport(await api.updateReport(reportId, content));
}

export async function exportReportPdf(reportId: string): Promise<{ downloadUrl: string }> {
  const res = await api.exportReportPdf(reportId);
  return { downloadUrl: res.download_url };
}

export function reportTypeLabel(type: ProjectReportType): string {
  return { daily_status: 'Báo cáo ngày', weekly_status: 'Báo cáo tuần' }[type];
}

export function reportStatusLabel(status: ProjectReport['status']): string {
  return {
    generating: 'Đang tạo',
    draft: 'Bản nháp',
    edited: 'Đã chỉnh sửa',
    exported: 'Đã xuất PDF',
    failed: 'Lỗi',
  }[status];
}
