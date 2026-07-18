import { delay } from './mockClient';
import type { PermissionAction, Role, RolePermissionRow } from '../types';

let rolePermissions: RolePermissionRow[] = [
  {
    role: 'leadership',
    roleLabel: 'Ban lãnh đạo',
    permissions: { view: true, create: false, edit: false, approve: true, export: true, share: true },
  },
  {
    role: 'coordinator',
    roleLabel: 'Người điều phối hoạt động',
    permissions: { view: true, create: true, edit: true, approve: false, export: true, share: true },
  },
  {
    role: 'team_lead',
    roleLabel: 'Trưởng nhóm / trưởng dự án',
    permissions: { view: true, create: true, edit: true, approve: true, export: true, share: true },
  },
  {
    role: 'staff',
    roleLabel: 'Nhân viên',
    permissions: { view: true, create: true, edit: true, approve: false, export: false, share: false },
  },
  {
    role: 'volunteer',
    roleLabel: 'Tình nguyện viên',
    permissions: { view: true, create: false, edit: false, approve: false, export: false, share: false },
  },
  {
    role: 'admin',
    roleLabel: 'Người quản trị hệ thống',
    permissions: { view: true, create: true, edit: true, approve: true, export: true, share: true },
  },
];

export async function listRolePermissions(): Promise<RolePermissionRow[]> {
  return delay([...rolePermissions]);
}

export async function togglePermission(role: Role, action: PermissionAction): Promise<RolePermissionRow> {
  rolePermissions = rolePermissions.map((r) =>
    r.role === role ? { ...r, permissions: { ...r.permissions, [action]: !r.permissions[action] } } : r,
  );
  return delay(rolePermissions.find((r) => r.role === role)!);
}

export const PERMISSION_ACTIONS: { value: PermissionAction; label: string }[] = [
  { value: 'view', label: 'Xem' },
  { value: 'create', label: 'Tạo' },
  { value: 'edit', label: 'Chỉnh sửa' },
  { value: 'approve', label: 'Phê duyệt' },
  { value: 'export', label: 'Xuất dữ liệu' },
  { value: 'share', label: 'Chia sẻ' },
];
