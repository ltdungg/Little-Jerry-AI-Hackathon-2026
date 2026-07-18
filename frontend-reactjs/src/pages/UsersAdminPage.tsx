import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import { listUserAccounts, setUserAccountStatus, createMember } from '../services/people.service';
import { listTeams } from '../services/teams.service';
import type { Role, UserAccount, MemberKind, Team } from '../types';
import { createAdminUser } from '../lib/api';

interface FormData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  role: Role;
  kind: MemberKind;
  teamName: string;
  startDate: string;
  endDate: string;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'leadership', label: 'Lãnh đạo' },
  { value: 'coordinator', label: 'Điều phối viên' },
  { value: 'team_lead', label: 'Trưởng nhóm' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'volunteer', label: 'Tình nguyện viên' },
  { value: 'admin', label: 'Quản trị viên' },
];

const ROLE_LABELS: Record<Role, string> = {
  leadership: 'Lãnh đạo',
  coordinator: 'Điều phối viên',
  team_lead: 'Trưởng nhóm',
  staff: 'Nhân viên',
  volunteer: 'Tình nguyện viên',
  admin: 'Quản trị viên',
};

export function UsersAdminPage() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'staff',
    kind: 'staff',
    teamName: '',
    startDate: '',
    endDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { items, setItems, loading } = useMockList(() => listUserAccounts(), []);
  const { items: teams } = useMockList(() => listTeams(), []);

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
      // Step 1: Create admin user (login account)
      await createAdminUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // Step 2: Create member record
      const team = teams.find((t: Team) => t.name === formData.teamName);
      await createMember({
        name: formData.fullName || formData.username,
        email: formData.email,
        role: formData.role,
        roleName: ROLE_LABELS[formData.role],
        teamName: formData.teamName,
        programNames: team?.programNames ?? [],
        kind: formData.kind,
      });

      setShowModal(false);
      setFormData({
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: 'staff',
        kind: 'staff',
        teamName: '',
        startDate: '',
        endDate: '',
      });
      alert('Tạo tài khoản và hồ sơ thành viên thành công!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
        title="Quản trị thành viên"
        subtitle="Tạo tài khoản đăng nhập và hồ sơ thành viên trong một bước. Quản lý trạng thái tài khoản."
        action={
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Icon name="UserPlus" size={15} />
            Thêm thành viên mới
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Thêm thành viên mới</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="X" size={20} />
              </button>
            </div>

            {errorMsg && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{errorMsg}</div>}

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Account section */}
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tài khoản đăng nhập</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tên đăng nhập *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => updateField('username', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="nguyenvana"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu tạm thời *</label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="Ít nhất 8 ký tự"
                    />
                  </div>
                </div>
              </div>

              {/* Member info section */}
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông tin thành viên</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="Nguyen Van A"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="nguyenvana@aiforvietnam.org"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Vai trò *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => updateField('role', e.target.value as Role)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Loại *</label>
                    <select
                      value={formData.kind}
                      onChange={(e) => updateField('kind', e.target.value as MemberKind)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="staff">Nhân viên</option>
                      <option value="volunteer">Tình nguyện viên</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nhóm</label>
                    <select
                      value={formData.teamName}
                      onChange={(e) => updateField('teamName', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">-- Chọn nhóm --</option>
                      {teams.map((t: Team) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  {formData.kind === 'volunteer' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Ngày kết thúc</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateField('endDate', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản & hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
