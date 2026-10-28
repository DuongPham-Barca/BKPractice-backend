import { RoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';
import { UserManagementUseCases, type UserManagementRepository } from '@/modules/users/application';

describe('UserManagementUseCases', () => {
  const admin: AuthorizationPrincipal = {
    userId: 'admin-id', roles: [RoleName.Admin], permissions: ['user:read', 'user:delete'],
  };
  const user = {
    userId: 'user-id', studentId: '123', email: 'student@example.test', displayName: 'Dũng',
    status: 'ACTIVE' as const, roles: [RoleName.Student], createdAt: new Date('2026-01-01'), deletedAt: null,
  };
  let repository: jest.Mocked<UserManagementRepository>;
  let cases: UserManagementUseCases;

  beforeEach(() => {
    repository = {
      list: jest.fn().mockResolvedValue({ items: [user], hasMore: true }),
      find: jest.fn().mockResolvedValue(user),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    cases = new UserManagementUseCases(repository);
  });

  it('requires both ADMIN role and the matching permission', async () => {
    for (const principal of [
      { ...admin, roles: [RoleName.Student] },
      { ...admin, permissions: ['user:import'] },
    ]) {
      await expect(cases.listUsers(principal, 1, 20, false)).rejects.toThrow('forbidden');
      await expect(cases.deleteUser(principal, user.userId)).rejects.toThrow('forbidden');
    }
    await expect(cases.deleteUser({ ...admin, permissions: ['user:read'] }, user.userId))
      .rejects.toThrow('forbidden');
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('pages users, retrieves deleted details, and delegates idempotent deletion', async () => {
    expect(await cases.listUsers(admin, 2, 5, true)).toEqual({
      items: [user], page: 2, limit: 5, hasMore: true,
    });
    expect(repository.list).toHaveBeenCalledWith(2, 5, true);
    const deleted = { ...user, deletedAt: new Date('2026-01-02') };
    repository.find.mockResolvedValueOnce(deleted);
    expect(await cases.getUser(admin, user.userId)).toEqual(deleted);
    await cases.deleteUser(admin, user.userId);
    expect(repository.softDelete).toHaveBeenCalledWith(user.userId);
  });

  it('rejects invalid page bounds and missing users', async () => {
    for (const [page, limit] of [[0, 20], [1, 0], [1, 51], [1.5, 20], [Number.MAX_SAFE_INTEGER, 50]] as Array<[number, number]>) {
      await expect(cases.listUsers(admin, page, limit, false)).rejects.toThrow('invalid');
    }
    expect(repository.list).not.toHaveBeenCalled();
    repository.find.mockResolvedValueOnce(null);
    await expect(cases.getUser(admin, 'missing')).rejects.toThrow('not_found');
  });
});
