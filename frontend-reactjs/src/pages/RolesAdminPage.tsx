import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { useMockList } from '../hooks/useMockList';
import { PERMISSION_ACTIONS, listRolePermissions, togglePermission } from '../services/roles.service';
import type { PermissionAction, Role } from '../types';

export function RolesAdminPage() {
  const { items, setItems, loading } = useMockList(() => listRolePermissions(), []);

  async function handleToggle(role: Role, action: PermissionAction) {
    setItems((prev) =>
      prev.map((r) => (r.role === role ? { ...r, permissions: { ...r.permissions, [action]: !r.permissions[action] } } : r)),
    );
    await togglePermission(role, action);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Vai trò và quyền" subtitle="Kiểm soát quyền xem, tạo, chỉnh sửa, phê duyệt, xuất và chia sẻ dữ liệu theo vai trò." />

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                {PERMISSION_ACTIONS.map((a) => (
                  <th key={a.value} className="px-4 py-3 text-center font-medium">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.role} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.roleLabel}</td>
                  {PERMISSION_ACTIONS.map((a) => (
                    <td key={a.value} className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(row.role, a.value)}
                        aria-label={`${row.roleLabel} — ${a.label}`}
                        className="inline-flex"
                      >
                        <Icon
                          name={row.permissions[a.value] ? 'CheckSquare' : 'Square'}
                          size={17}
                          className={row.permissions[a.value] ? 'text-brand-600' : 'text-slate-300'}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
