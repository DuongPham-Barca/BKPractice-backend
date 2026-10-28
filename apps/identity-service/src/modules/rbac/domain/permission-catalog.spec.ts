import { RoleName, rbacPermissionCatalog, validatePermissionCode } from '@/modules/rbac/domain';

describe('RBAC permission catalog', () => {
  it('contains the approved codes and unique role-permission mappings', () => {
    const codes = rbacPermissionCatalog.map(({ code }) => code);
    expect(new Set(codes).size).toBe(36);
    expect(new Set(rbacPermissionCatalog.map(({ code, role }) => `${role}:${code}`)).size).toBe(
      rbacPermissionCatalog.length,
    );
    expect(codes.every(validatePermissionCode)).toBe(true);
    const student = [
      'class:join',
      'class:leave',
      'class:read-enrolled',
      'assignment:read-enrolled',
    ];
    const lecturer = [
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
    const approved: Record<RoleName, string[]> = {
      [RoleName.Student]: student,
      [RoleName.Lecturer]: lecturer,
      [RoleName.Admin]: [...student, ...lecturer, 'community:moderate', 'user:import', 'user:read', 'user:delete'],
    };

    expect(rbacPermissionCatalog).toHaveLength(68);
    for (const role of Object.values(RoleName)) {
      expect(
        rbacPermissionCatalog
          .filter((permission) => permission.role === role)
          .map(({ code }) => code)
          .sort(),
      ).toEqual(approved[role].sort());
    }
  });
});
