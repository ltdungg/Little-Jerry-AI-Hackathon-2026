import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { listMembers } from '../../services/people.service';
import type { MemberRecord } from '../../types';

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: string, userName: string, userInitials: string) => Promise<void>;
  taskTitle: string;
}

export function AssignModal({ isOpen, onClose, onAssign, taskTitle }: AssignModalProps) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      listMembers({ status: 'active' }).then(res => {
        setMembers(res);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.teamName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Bàn giao công việc</h2>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-xs">{taskTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <Icon name="X" size={20} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="relative mb-4">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm theo tên hoặc nhóm..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-[200px] border border-slate-100 rounded-xl">
            {loading ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-slate-400">Đang tải danh sách...</div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-slate-400">Không tìm thấy ai phù hợp</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map(m => (
                  <button
                    key={m.id}
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      await onAssign(m.id, m.name, m.initials);
                      setSubmitting(false);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between p-3 hover:bg-slate-50 transition-colors disabled:opacity-50 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600 shrink-0">
                        {m.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.teamName} • {m.roleLabel}</p>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      Chọn
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
