import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import { listUserAccounts, setUserAccountStatus } from '../services/people.service';
import type { UserAccount } from '../types';
import { createAdminUser } from '../lib/api';

export function UsersAdminPage() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { items, setItems, loading } = useMockList(() => listUserAccounts(), []);

  async function handleToggleLock(user: UserAccount) {
    const nextStatus = user.status === 'active' ? 'locked' : 'active';
    setItems((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    await setUserAccountStatus(user.id, nextStatus);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await createAdminUser(formData);
      setShowModal(false);
      setFormData({ username: '', email: '', password: '' });
      // In a real app, we'd fetch the list again or append to local state
      alert('Tạo tài khoản thành công!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setSubmitting(false);
    }
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
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Tạo tài khoản mới</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="X" size={20} />
              </button>
            </div>
            {errorMsg && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{errorMsg}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tên người dùng (Username)</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu tạm thời</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
