import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import { listUserAccounts, setUserAccountStatus } from '../services/people.service';
import type { UserAccount } from '../types';

export function UsersAdminPage() {
  const { items, setItems, loading } = useMockList(() => listUserAccounts(), []);

  async function handleToggleLock(user: UserAccount) {
    const nextStatus = user.status === 'active' ? 'locked' : 'active';
    setItems((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    await setUserAccountStatus(user.id, nextStatus);
  }

  const columns: Column<UserAccount>[] = [
    {
      header: 'Người dùng',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {u.initials}
          </div>
          <div>
            <p className="font-medium text-slate-800">{u.name}</p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Vai trò', render: (u) => u.roleLabel },
    { header: 'Nhóm', render: (u) => u.teamName },
    { header: 'Loại', render: (u) => <Pill tone={u.kind === 'staff' ? 'blue' : 'violet'}>{u.kind === 'staff' ? 'Nhân viên' : 'TNV'}</Pill> },
    {
      header: 'Thời gian tham gia',
      render: (u) => (
        <span>
          {u.startDate} {u.endDate && `→ ${u.endDate}`}
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      render: (u) => (
        <button
          type="button"
          onClick={() => handleToggleLock(u)}
          className="inline-flex items-center gap-1"
        >
          <Pill tone={u.status === 'active' ? 'emerald' : 'rose'} icon={u.status === 'active' ? 'CheckCircle2' : 'Lock'}>
            {u.status === 'active' ? 'Hoạt động' : 'Đã khoá'}
          </Pill>
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Người dùng"
        subtitle="Quản lý tài khoản nhân viên và tình nguyện viên — bấm vào trạng thái để khoá/mở khoá."
        action={
          <button type="button" className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Icon name="UserPlus" size={15} />
            Tạo tài khoản
          </button>
        }
      />

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table columns={columns} rows={items} rowKey={(u) => u.id} emptyIcon="UserCog" emptyTitle="Không có người dùng" />
        )}
      </div>
    </div>
  );
}
