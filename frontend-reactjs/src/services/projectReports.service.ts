import { delay, nextId } from './mockClient';
import { PROJECTS } from '../lib/mockData';
import { listTasks } from './tasks.service';
import { listIssues } from './issues.service';
import { listDailyUpdates, TODAY_LABEL } from './dailyUpdates.service';
import type { Project, ProjectReport, ProjectReportTrigger, ProjectReportType } from '../types';

/**
 * Nội dung báo cáo được "sinh" ở đây để mô phỏng lời gọi AWS Bedrock AgentCore
 * (agent "reporting", xem agents/reporting/agent.py) — cùng cách tổng hợp
 * task/risk thật, không bịa số liệu. `delay(...)` mô phỏng độ trễ gọi runtime.
 */
async function buildReportMarkdown(
  project: Project,
  reportType: ProjectReportType,
  periodLabel: string,
): Promise<string> {
  const [tasks, issues, dailyUpdates] = await Promise.all([
    listTasks({ programId: project.id }),
    listIssues({ programId: project.id }),
    listDailyUpdates({ programId: project.id }),
  ]);

  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const openIssues = issues.filter((i) => i.status !== 'resolved' && i.status !== 'closed');

  const title = reportType === 'daily_update' ? 'Cập nhật ngày' : 'Báo cáo tuần';
  const lines: string[] = [
    `# ${title} — ${project.name}`,
    `**Kỳ báo cáo:** ${periodLabel}`,
    '',
    '## Tiến độ nhiệm vụ',
    `- Tổng số nhiệm vụ: ${tasks.length}`,
    `- Hoàn thành: ${done}`,
    `- Đang làm: ${inProgress}`,
    `- Bị chặn: ${blocked}`,
    `- Chưa bắt đầu: ${todo}`,
  ];

  if (dailyUpdates.length > 0) {
    lines.push('', '## Cập nhật hằng ngày trong kỳ');
    for (const update of dailyUpdates) {
      for (const tu of update.taskUpdates) {
        lines.push(`- ${update.userName}: "${tu.taskTitle}" → ${tu.statusAfter}${tu.note ? ` (${tu.note})` : ''}`);
      }
    }
  } else {
    lines.push('', '## Cập nhật hằng ngày trong kỳ', 'Chưa có cập nhật hằng ngày nào được ghi nhận trong kỳ này.');
  }

  lines.push('', '## Khó khăn đang mở');
  if (openIssues.length === 0) {
    lines.push('Không có khó khăn nào đang mở.');
  } else {
    for (const issue of openIssues) {
      lines.push(`- ${issue.title} (mức ảnh hưởng: ${issue.impact})`);
    }
  }

  return lines.join('\n');
}

let reports: ProjectReport[] = [
  {
    id: 'rpt-1',
    projectId: 'proj-rural-edu',
    reportType: 'weekly_update',
    periodLabel: 'Tuần 29, 2026 (13–19 Th7)',
    status: 'draft',
    generatedBy: 'schedule',
    contentMarkdown:
      '# Báo cáo tuần — Rural Education\n**Kỳ báo cáo:** Tuần 29, 2026 (13–19 Th7)\n\n## Tiến độ nhiệm vụ\n- Tổng số nhiệm vụ: 3\n- Hoàn thành: 1\n- Đang làm: 0\n- Bị chặn: 1\n- Chưa bắt đầu: 1\n\n## Khó khăn đang mở\n- Nhà thầu chậm gửi báo giá điều chỉnh (mức ảnh hưởng: high)\n- Thiếu 5 vị trí quản lý công trình (mức ảnh hưởng: critical)',
    contentAiOriginal:
      '# Báo cáo tuần — Rural Education\n**Kỳ báo cáo:** Tuần 29, 2026 (13–19 Th7)\n\n## Tiến độ nhiệm vụ\n- Tổng số nhiệm vụ: 3\n- Hoàn thành: 1\n- Đang làm: 0\n- Bị chặn: 1\n- Chưa bắt đầu: 1\n\n## Khó khăn đang mở\n- Nhà thầu chậm gửi báo giá điều chỉnh (mức ảnh hưởng: high)\n- Thiếu 5 vị trí quản lý công trình (mức ảnh hưởng: critical)',
    isEdited: false,
    editedBy: null,
    editedAt: null,
    pdfExportedAt: null,
    createdAt: 'Chủ nhật, 18:00',
  },
];

export async function listProjectReports(projectId: string): Promise<ProjectReport[]> {
  return delay(reports.filter((r) => r.projectId === projectId).slice().reverse());
}

/** Cho trang tổng hợp `/reports/weekly` — báo cáo tuần mới nhất của mọi dự án. */
export async function listLatestWeeklyReports(): Promise<{ project: Project; report: ProjectReport | undefined }[]> {
  const result = PROJECTS.map((project) => {
    const projectReports = reports
      .filter((r) => r.projectId === project.id && r.reportType === 'weekly_update')
      .sort((a, b) => b.id.localeCompare(a.id));
    return { project, report: projectReports[0] };
  });
  return delay(result);
}

export async function getReport(id: string): Promise<ProjectReport | undefined> {
  return delay(reports.find((r) => r.id === id));
}

export async function generateReports(
  projectId: string,
  types: ProjectReportType[],
  trigger: ProjectReportTrigger,
): Promise<ProjectReport[]> {
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) return [];

  const created: ProjectReport[] = [];
  for (const reportType of types) {
    const periodLabel = reportType === 'daily_update' ? `Ngày ${TODAY_LABEL}` : 'Tuần 29, 2026 (13–19 Th7)';
    const content = await buildReportMarkdown(project, reportType, periodLabel);
    const report: ProjectReport = {
      id: nextId('rpt'),
      projectId,
      reportType,
      periodLabel,
      status: 'draft',
      generatedBy: trigger,
      contentMarkdown: content,
      contentAiOriginal: content,
      isEdited: false,
      editedBy: null,
      editedAt: null,
      pdfExportedAt: null,
      createdAt: 'vừa xong',
    };
    created.push(report);
  }
  reports = [...reports, ...created];
  return delay(created, 600);
}

export async function updateReportContent(id: string, content: string, editedBy: string): Promise<ProjectReport> {
  reports = reports.map((r) =>
    r.id === id
      ? { ...r, contentMarkdown: content, status: 'edited' as const, isEdited: true, editedBy, editedAt: 'vừa xong' }
      : r,
  );
  return delay(reports.find((r) => r.id === id)!);
}

export async function revertReport(id: string): Promise<ProjectReport> {
  reports = reports.map((r) =>
    r.id === id
      ? { ...r, contentMarkdown: r.contentAiOriginal, status: 'draft' as const, isEdited: false, editedBy: null, editedAt: null }
      : r,
  );
  return delay(reports.find((r) => r.id === id)!);
}

export async function markReportExported(id: string): Promise<ProjectReport> {
  reports = reports.map((r) =>
    r.id === id ? { ...r, status: 'exported' as const, pdfExportedAt: 'vừa xong' } : r,
  );
  return delay(reports.find((r) => r.id === id)!);
}

export function reportTypeLabel(type: ProjectReportType): string {
  return { daily_update: 'Báo cáo ngày', weekly_update: 'Báo cáo tuần' }[type];
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
