import { PageHeader } from '../components/common/PageHeader';
import { OrgChart } from '../components/common/OrgChart';
import { useMockList } from '../hooks/useMockList';
import { listMembers } from '../services/people.service';

export function OrgChartPage() {
  const { items, loading } = useMockList(() => listMembers(), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Sơ đồ tổ chức" subtitle="Cơ cấu tổ chức từ cấp lãnh đạo xuống từng nhân viên và tình nguyện viên." />

      <div className="mt-4">
        {loading ? <p className="text-sm text-slate-400">Đang tải...</p> : <OrgChart members={items} />}
      </div>
    </div>
  );
}
