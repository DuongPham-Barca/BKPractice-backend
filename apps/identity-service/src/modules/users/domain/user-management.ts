import { evaluatePermission, RoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

export interface UserAdminProjection {
  userId: string;
  studentId: string | null;
  email: string;
  displayName: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'PENDING';
  roles: string[];
  createdAt: Date;
  deletedAt: Date | null;
}

export class UserManagementFailure extends Error {
  constructor(readonly code: 'invalid' | 'not_found' | 'forbidden' | 'conflict') {
    super(code);
  }
}

export function requireUserManagementPermission(
  principal: AuthorizationPrincipal,
  permission: 'user:read' | 'user:delete' | 'user:create' | 'user:status',
): void {
  if (
    !principal.roles.includes(RoleName.Admin) ||
    !evaluatePermission(principal, permission).allowed
  )
    throw new UserManagementFailure('forbidden');
}

export interface CreateManagedUser {
  studentId: string | null;
  displayName: string;
  email: string;
  password: string;
  role: RoleName;
  reason: string;
}

export interface UserListFilters {
  q?: string;
  role?: RoleName;
  status?: UserAdminProjection['status'];
}

export function validateAdminReason(value: string): string {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (!reason || reason.length > 500 || /\p{Cc}/u.test(reason))
    throw new UserManagementFailure('invalid');
  return reason;
}

export function validateCreateManagedUser(input: CreateManagedUser): CreateManagedUser {
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const studentId = typeof input.studentId === 'string' ? input.studentId.trim() : null;
  const role = input.role;
  const domain = role === RoleName.Student ? 'sv1.dut.udn.vn' : 'dut.udn.vn';
  if (
    ![RoleName.Student, RoleName.Lecturer, RoleName.Admin].includes(role) ||
    !displayName ||
    displayName.length > 100 ||
    /\p{Cc}/u.test(displayName) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 320 ||
    !email.endsWith(`@${domain}`) ||
    typeof input.password !== 'string' ||
    input.password.length < 8 ||
    input.password.length > 128 ||
    (role === RoleName.Student
      ? !studentId || studentId.length > 64 || /\s/.test(studentId)
      : studentId !== null && studentId !== '')
  )
    throw new UserManagementFailure('invalid');
  return {
    ...input,
    studentId: role === RoleName.Student ? studentId : null,
    displayName,
    email,
    reason: validateAdminReason(input.reason),
  };
}
