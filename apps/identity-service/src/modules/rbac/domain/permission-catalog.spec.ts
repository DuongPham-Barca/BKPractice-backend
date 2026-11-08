import { RoleName, rbacPermissionCatalog, validatePermissionCode } from '@/modules/rbac/domain';

describe('RBAC permission catalog', () => {
  it('contains the approved codes and unique role-permission mappings', () => {
    const codes = rbacPermissionCatalog.map(({ code }) => code);
    expect(new Set(codes).size).toBe(22);
    expect(new Set(rbacPermissionCatalog.map(({ code, role }) => `${role}:${code}`)).size).toBe(
      rbacPermissionCatalog.length,
    );
    expect(codes.every(validatePermissionCode)).toBe(true);
    const learningAdmin = [
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
    const approved: Record<RoleName, string[]> = {
      [RoleName.Student]: [],
      [RoleName.Lecturer]: [...learningAdmin],
      [RoleName.Admin]: [
        ...learningAdmin,
        'community:moderate',
        'user:import',
        'user:read',
        'user:delete',
        'user:create',
        'user:status',
      ],
    };

    expect(rbacPermissionCatalog).toHaveLength(38);
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
