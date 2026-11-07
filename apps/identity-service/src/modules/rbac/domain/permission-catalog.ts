import { RoleName } from '@/modules/rbac/domain/role-name';

const learningAdminPermissionCodes = [
  'problem:create',
  'problem:read-managed',
  'problem:update',
  'problem:publish',
  'problem:hold',
  'problem:republish',
  'problem:delete',
  'problem:restore',
  'course:create',
  'course:read-managed',
  'course:update',
  'course:publish',
  'course:hold',
  'course:republish',
  'course:delete',
  'course:restore',
];

const adminPermissionCodes = [
  ...learningAdminPermissionCodes,
  'community:moderate',
  'user:import',
  'user:read',
  'user:delete',
];

export const rbacPermissionCatalog = [
  ...adminPermissionCodes.map((code) => ({ code, role: RoleName.Admin })),
];
