/** Role → permission matrix. The UI asks can(); the backend phase enforces the same table with RLS. */
import type { Role } from '@/types/domain';

export const PERMISSIONS = {
  'workspace.manage': ['owner'],
  'billing.manage': ['owner'],
  'members.manage': ['owner', 'admin'],
  'projects.manage': ['owner', 'admin', 'manager'],
  'tasks.assign': ['owner', 'admin', 'manager'],
  'tasks.edit': ['owner', 'admin', 'manager', 'member'],
  'time.track': ['owner', 'admin', 'manager', 'member'],
  'view': ['owner', 'admin', 'manager', 'member', 'viewer']
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;
export const can = (role: Role, action: Permission): boolean => (PERMISSIONS[action] as readonly Role[]).includes(role);
