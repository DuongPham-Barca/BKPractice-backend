import { collectEffectivePermissions, validatePermissionCode } from './effective-permissions';

describe('Effective permissions', () => {
  it('accepts approved code syntax and rejects invalid or long codes', () => {
    expect(validatePermissionCode('problem:read-managed')).toBe(true);
    expect(validatePermissionCode('Problem:read')).toBe(false);
    expect(validatePermissionCode('problem:')).toBe(false);
    expect(validatePermissionCode(`${'p'.repeat(64)}:read`)).toBe(false);
  });

  it('deduplicates and sorts permissions from multiple roles', () => {
    expect(
      collectEffectivePermissions(['problem:publish', 'problem:create', 'problem:create']),
    ).toEqual(['problem:create', 'problem:publish']);
    expect(collectEffectivePermissions([])).toEqual([]);
  });
});
