import { RoleName } from '@/modules/rbac/domain/role-name';

const lecturerPermissionCodes = [
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
  'class:create',
  'class:read-managed',
  'class:update',
  'class:archive',
  'class:restore',
  'class:manage-members',
  'assignment:create',
  'assignment:read-managed',
  'assignment:update',
  'assignment:publish',
  'assignment:delete',
  'assignment:restore',
];

const studentPermissionCodes = [
  'class:join',
  'class:leave',
  'class:read-enrolled',
  'assignment:read-enrolled',
];

const adminPermissionCodes = [
  ...studentPermissionCodes,
  ...lecturerPermissionCodes,
  'community:moderate',
  'user:import',
  'user:read',
  'user:delete',
];

export const rbacPermissionCatalog = [
  ...studentPermissionCodes.map((code) => ({ code, role: RoleName.Student })),
  ...lecturerPermissionCodes.map((code) => ({ code, role: RoleName.Lecturer })),
  ...adminPermissionCodes.map((code) => ({ code, role: RoleName.Admin })),
];
