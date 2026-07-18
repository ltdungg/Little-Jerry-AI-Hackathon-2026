import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { createMember } from '../../services/people.service';
import { listTeams } from '../../services/teams.service';
import { listMembers } from '../../services/people.service';
import type { CreateMemberPayload, MemberKind, Role, Team } from '../../types';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'leadership', label: 'Ban lãnh đạo' },
  { value: 'coordinator', label: 'Điều phối viên' },
  { value: 'team_lead', label: 'Trưởng nhóm' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'volunteer', label: 'Tình nguyện viên' },
  { value: 'admin', label: 'Quản trị viên' },
];

const KIND_OPTIONS: { value: MemberKind; label: string }[] = [
  { value: 'staff', label: 'Nhân viên' },
  { value: 'volunteer', label: 'Tình nguyện viên' },
];

export function CreateMemberModal({ isOpen, onClose, onCreated }: CreateMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [teamName, setTeamName] = useState('');
  const [kind, setKind] = useState<MemberKind>('staff');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: string; name: string; teamName: string; roleLabel: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      Promise.all([listTeams(), listMembers({ status: 'active' })])
        .then(([t, m]) => {
          setTeams(t);
          setAllMembers(m);
          setLoadingData(false);
        })
        .catch(() => setLoadingData(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('staff');
    setTeamName('');
    setKind('staff');
    setManagerId('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên thành viên');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label || 'Nhân viên';
      const payload: CreateMemberPayload = {
        name: name.trim(),
        email: email.trim(),
        role,
        roleName: roleLabel,
        teamName,
        programNames: [],
        kind,
        managerId: managerId || undefined,
      };
      await createMember(payload);
      resetForm();
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không thể thêm thành viên. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredManagers = allMembers.filter(
    (m) => m.id !== '' && (m.roleLabel.includes('Trưởng') || m.roleLabel.includes('Lãnh') || m.roleLabel.includes('Điều phối')),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Thêm thành viên mới</h2>
            <p className="text-xs text-slate-500 mt-1">Điền thông tin bên dưới để thêm thành viên</p>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="Loader2" size={20} className="animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyen Van A"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: nguyenvana@aiv.org"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vai trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Kind */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as MemberKind)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>

              {/* Team */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nhóm</label>
                <select
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Chọn nhóm --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Manager (for hierarchy) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Icon name="Network" size={14} />
                    Quản lý trực tiếp (cấp trên)
                  </span>
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Không có quản lý --</option>
                  {filteredManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.roleLabel})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Chọn quản lý trực tiếp để tạo sơ đồ tổ chức phân cấp.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <Icon name="AlertCircle" size={14} />
              {error}
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting || loadingData}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Icon name="UserPlus" size={16} />
                  Thêm thành viên
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
