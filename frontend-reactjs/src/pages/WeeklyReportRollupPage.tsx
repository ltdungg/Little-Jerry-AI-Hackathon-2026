import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import { listLatestWeeklyReports, reportStatusLabel } from '../services/projectReports.service';
import type { Project, ProjectReport } from '../types';

type Row = { project: Project; report: ProjectReport | undefined };

export function WeeklyReportRollupPage() {
  const navigate = useNavigate();
  const { items, loading } = useMockList(() => listLatestWeeklyReports(), []);

  const columns: Column<Row>[] = [
    {
      header: 'Dự án',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.project.name}</p>
          <p className="text-xs text-slate-400">{row.project.program}</p>
        </div>
      ),
    },
    {
      header: 'Trạng thái báo cáo tuần mới nhất',
      render: (row) =>
        row.report ? (
          <Pill tone={row.report.status === 'exported' ? 'emerald' : row.report.status === 'edited' ? 'amber' : 'blue'}>
            {reportStatusLabel(row.report.status)}
          </Pill>
        ) : (
          <span className="text-sm text-slate-400">Chưa có báo cáo</span>
        ),
    },
    {
      header: 'Kỳ báo cáo',
      render: (row) => row.report?.periodLabel ?? <span className="text-slate-400">—</span>,
    },
    {
      header: 'Ngày tạo',
      render: (row) => row.report?.createdAt ?? <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Báo cáo hằng tuần"
        subtitle="Tổng hợp trạng thái báo cáo tuần của tất cả dự án. Bấm vào một dự án để mở tab 'Xuất báo cáo' và xem/sửa/xuất PDF."
      />

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table
            columns={columns}
            rows={items}
            rowKey={(row) => row.project.id}
            onRowClick={(row) => navigate(`/projects/${row.project.id}/reports`)}
            emptyIcon="FileText"
            emptyTitle="Chưa có dự án nào"
          />
        )}
      </div>
    </div>
  );
}
