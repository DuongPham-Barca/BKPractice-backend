export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'PENDING';

export interface AuthAccount {
  userId: string;
  studentId: string | null;
  email: string;
  status: AccountStatus;
  roles: string[];
}

export interface LocalAuthAccount extends AuthAccount {
  passwordHash: string;
}

export interface MicrosoftIdentity {
  tenantId: string;
  objectId: string;
  username: string;
}

export function requireActiveAccount(account: AuthAccount | null): asserts account is AuthAccount {
  if (!account || account.status !== 'ACTIVE') throw new AuthFailure('invalid_credentials');
}

export class AuthFailure extends Error {
  constructor(readonly code: 'invalid_credentials' | 'invalid_token' | 'dependency_unavailable') {
    super(code);
  }
}
