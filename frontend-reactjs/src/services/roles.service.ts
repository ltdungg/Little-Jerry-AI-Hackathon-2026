import * as api from '../lib/api';
import type { PermissionAction, Role, RolePermissionRow } from '../types';

function mapRow(r: any): RolePermissionRow {
  return {
    role: r.role,
    roleLabel: r.role_label || '',
    permissions: r.permissions,
  };
}

export async function listRolePermissions(): Promise<RolePermissionRow[]> {
  const raw = await api.getRolePermissions();
  return raw.map(mapRow);
}

export async function togglePermission(role: Role, action: PermissionAction): Promise<RolePermissionRow> {
  const raw = await api.toggleRolePermission(role, action);
  return mapRow(raw);
}

export const PERMISSION_ACTIONS: { value: PermissionAction; label: string }[] = [
  { value: 'view', label: 'Xem' },
  { value: 'create', label: 'Tạo' },
  { value: 'edit', label: 'Chỉnh sửa' },
  { value: 'approve', label: 'Phê duyệt' },
  { value: 'export', label: 'Xuất dữ liệu' },
  { value: 'share', label: 'Chia sẻ' },
];
