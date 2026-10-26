import {
  AssignRoleToUser,
  EvaluateAuthorization,
  GetUserRoles,
  RevokeRoleFromUser,
  type RbacRepository,
  type TransactionRunner,
} from '@/modules/rbac/application';
import {
  RoleName,
  type AuthorizationPrincipal,
  RbacFailure,
  evaluatePermission,
  isRoleName,
} from '@/modules/rbac/domain';

const admin: AuthorizationPrincipal = { userId: 'admin', roles: [RoleName.Admin], permissions: [] };

function createRepository(): jest.Mocked<RbacRepository> {
  return {
    findUserRoles: jest.fn().mockResolvedValue({ userId: 'target', roles: [RoleName.Student] }),
    assignRole: jest.fn().mockResolvedValue(undefined),
    revokeRole: jest.fn().mockResolvedValue(undefined),
    lockAdminRole: jest.fn().mockResolvedValue(undefined),
    countAdmins: jest.fn().mockResolvedValue(2),
  };
}

describe('RBAC policies and use cases (ID-003 AC-001–AC-014)', () => {
  let repository: jest.Mocked<RbacRepository>;
  let transactions: TransactionRunner;

  beforeEach(() => {
    repository = createRepository();
    transactions = { run: (operation) => operation(repository) };
  });

  it.each([RoleName.Student, RoleName.Lecturer])(
    'rejects role management by %s before persistence',
    (role) => {
      const principal = { userId: 'target', roles: [role], permissions: [] };
      expect(() => new GetUserRoles(repository).execute(principal, 'target')).toThrow('forbidden');
      expect(() =>
        new AssignRoleToUser(transactions).execute(principal, 'target', RoleName.Lecturer),
      ).toThrow('forbidden');
      expect(() =>
        new RevokeRoleFromUser(transactions).execute(principal, 'target', RoleName.Student),
      ).toThrow('forbidden');
      expect(repository.findUserRoles).not.toHaveBeenCalled();
    },
  );

  it('rejects unknown roles and all ADMIN grants (AC-008a, AC-014)', () => {
    expect(isRoleName('MODERATOR')).toBe(false);
    expect(() =>
      new AssignRoleToUser(transactions).execute(admin, 'target', RoleName.Admin),
    ).toThrow('forbidden');
    expect(() =>
      new RevokeRoleFromUser(transactions).execute(admin, 'target', RoleName.Admin),
    ).toThrow('forbidden');
    expect(repository.assignRole).not.toHaveBeenCalled();
    expect(repository.revokeRole).not.toHaveBeenCalled();
  });

  it('returns safe assignments and rejects absent targets before writing (AC-008c)', async () => {
    expect(await new GetUserRoles(repository).execute(admin, 'target')).toEqual({
      userId: 'target',
      roles: [RoleName.Student],
    });
    repository.findUserRoles.mockResolvedValue(null);
    await expect(
      new AssignRoleToUser(transactions).execute(admin, 'missing', RoleName.Lecturer),
    ).rejects.toEqual(new RbacFailure('user_not_found'));
    expect(repository.assignRole).not.toHaveBeenCalled();
  });

  it('protects the last Admin after obtaining the transaction lock (AC-008b)', async () => {
    repository.findUserRoles.mockResolvedValue({ userId: 'admin', roles: [RoleName.Admin] });
    repository.countAdmins.mockImplementation(async () => {
      expect(repository.lockAdminRole).toHaveBeenCalledTimes(1);
      return 1;
    });
    await expect(
      new RevokeRoleFromUser(transactions).execute(admin, 'admin', RoleName.Admin),
    ).rejects.toEqual(new RbacFailure('last_admin'));
    expect(repository.revokeRole).not.toHaveBeenCalled();
  });

  it('permits self-revocation when another Admin remains', async () => {
    repository.findUserRoles.mockResolvedValue({ userId: 'admin', roles: [RoleName.Admin] });
    await new RevokeRoleFromUser(transactions).execute(admin, 'admin', RoleName.Admin);
    expect(repository.revokeRole).toHaveBeenCalledWith('admin', RoleName.Admin);
  });

  it('never bypasses permission or ownership checks for ADMIN (AC-001, AC-004, AC-006)', () => {
    const principal = { ...admin, permissions: ['problem:create'] };
    expect(evaluatePermission(admin, 'problem:create').allowed).toBe(false);
    expect(evaluatePermission(principal, 'problem:create', false).allowed).toBe(false);
    expect(evaluatePermission(principal, 'problem:create', true).allowed).toBe(true);
    expect(evaluatePermission(principal, '').allowed).toBe(false);
    expect(evaluatePermission({ ...principal, userId: '' }, 'problem:create').allowed).toBe(false);
  });

  it('uses the verified snapshot without giving an old token newly assigned permissions (AC-022)', () => {
    const evaluate = new EvaluateAuthorization();
    const newPrincipal = { ...admin, permissions: ['problem:create'] };
    expect(evaluate.execute(admin, 'problem:create').allowed).toBe(false);
    expect(evaluate.execute(newPrincipal, 'problem:create', true).allowed).toBe(true);
    expect(evaluate.execute(newPrincipal, 'problem:publish').allowed).toBe(false);
  });
});
