export interface BkAccessClaims {
  sub: string;
  roles: string[];
  permissions: string[];
  type: 'access';
  iat?: number;
  exp?: number;
}

export const BK_ACCESS_COOKIE_NAME = '__Host-bk_access';

export interface BkRefreshClaims {
  sub: string;
  jti: string;
  fid: string;
  type: 'refresh';
  iat?: number;
  exp: number;
}
