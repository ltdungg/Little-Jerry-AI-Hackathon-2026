import { useState } from 'react';
import { Icon } from './Icon';
import { createTeam } from '../../services/teams.service';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTeamModal({ isOpen, onClose, onCreated }: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [mission, setMission] = useState('');
  const [programNames, setProgramNames] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setMission('');
    setProgramNames('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const programs = programNames
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      await createTeam({
        name: name.trim(),
        mission: mission.trim(),
        programNames: programs,
        members: [],
      });
      resetForm();
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Tạo nhóm mới</h2>
            <p className="text-xs text-slate-500 mt-1">Điền thông tin bên dưới để tạo nhóm</p>
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
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên nhóm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Environment, Marine Conservation"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Mission */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sứ mệnh nhóm</label>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={3}
              placeholder="Mô tả sứ mệnh và mục tiêu chính của nhóm..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Program Names */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chương trình phụ trách</label>
            <input
              type="text"
              value={programNames}
              onChange={(e) => setProgramNames(e.target.value)}
              placeholder="VD: Green Hope, Ocean Rescue (phân tách bằng dấu phẩy)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Nhập tên các chương trình, phân tách bằng dấu phẩy.
            </p>
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
                  Tạo nhóm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
