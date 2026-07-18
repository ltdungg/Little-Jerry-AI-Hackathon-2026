import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { listMembers } from '../../services/people.service';
import { createProject } from '../../services/projects.service';
import type { CreateProjectPayload, MemberRecord, Role } from '../../types';

interface ProjectMemberEntry {
  userId: string;
  userName: string;
  userInitials: string;
  role: Role;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PROGRAM_OPTIONS = [
  'Green Hope Environmental Initiative',
  'Ocean Rescue Marine Conservation',
  'Digital Infrastructure',
  'Youth Development',
  'Economic Empowerment',
  'Emergency Response',
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'team_lead', label: 'Trưởng nhóm' },
  { value: 'coordinator', label: 'Điều phối viên' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'volunteer', label: 'Tình nguyện viên' },
];

export function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [members, setMembers] = useState<ProjectMemberEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [allMembers, setAllMembers] = useState<MemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingMembers(true);
      listMembers({ status: 'active' })
        .then((res) => {
          setAllMembers(res);
          setLoadingMembers(false);
        })
        .catch(() => setLoadingMembers(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableMembers = allMembers.filter(
    (m) =>
      !members.some((em) => em.userId === m.id) &&
      (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.teamName.toLowerCase().includes(memberSearch.toLowerCase())),
  );

  const addMember = (m: MemberRecord) => {
    setMembers((prev) => [
      ...prev,
      { userId: m.id, userName: m.name, userInitials: m.initials, role: 'staff' as Role },
    ]);
    setMemberSearch('');
    setShowMemberDropdown(false);
  };

  const removeMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const updateMemberRole = (userId: string, role: Role) => {
    setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
  };

  const resetForm = () => {
    setName('');
    setProgram(PROGRAM_OPTIONS[0]);
    setDescription('');
    setManagerId('');
    setJiraUrl('');
    setMembers([]);
    setError('');
    setMemberSearch('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên dự án');
      return;
    }
    if (!managerId) {
      setError('Vui lòng chọn quản lý dự án');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload: CreateProjectPayload = {
        name: name.trim(),
        program,
        description: description.trim(),
        managerId,
        jiraUrl: jiraUrl.trim(),
        members: members.map((m) => ({ userId: m.userId, role: m.role })),
      };
      await createProject(payload);
      resetForm();
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không thể tạo dự án. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Tạo dự án mới</h2>
            <p className="text-xs text-slate-500 mt-1">Điền thông tin bên dưới để tạo dự án</p>
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
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên dự án <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Green Hope Environmental Initiative"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Program */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chương trình</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {PROGRAM_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả dự án</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả ngắn gọn về mục tiêu và phạm vi dự án..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Quản lý dự án <span className="text-rose-500">*</span>
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">-- Chọn quản lý --</option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.teamName})
                </option>
              ))}
            </select>
          </div>

          {/* Jira URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Icon name="ExternalLink" size={14} />
                Link Jira Project
              </span>
            </label>
            <input
              type="url"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              placeholder="VD: https://yourcompany.atlassian.net/jira/software/projects/PROJ"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Gắn link Jira để dễ dàng truy xuất task và theo dõi tiến độ từ Jira.
            </p>
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Thành viên dự án
            </label>

            {/* Members already added */}
            {members.length > 0 && (
              <div className="space-y-2 mb-3">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                        {m.userInitials}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{m.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => updateMemberRole(m.userId, e.target.value as Role)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMember(m.userId)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search & add members */}
            <div className="relative">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowMemberDropdown(true);
                }}
                onFocus={() => setShowMemberDropdown(true)}
                placeholder="Tìm và thêm thành viên..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              {showMemberDropdown && memberSearch && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {loadingMembers ? (
                    <div className="p-3 text-center text-xs text-slate-400">Đang tải...</div>
                  ) : availableMembers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">Không tìm thấy thành viên</div>
                  ) : (
                    availableMembers.slice(0, 8).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => addMember(m)}
                        className="flex w-full items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                          {m.initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.teamName} &middot; {m.roleLabel}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
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
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Icon name="Plus" size={16} />
                  Tạo dự án
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
