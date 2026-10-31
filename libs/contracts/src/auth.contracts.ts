export interface BkAccessClaims {
  sub: string;
  sid: string;
  jti: string;
  roles: string[];
  permissions: string[];
  type: 'access';
  iat?: number;
  exp?: number;
}

export const BK_ACCESS_COOKIE_NAME = '__Host-bk_access';
export const BK_REFRESH_COOKIE_NAME = '__Secure-bk_refresh';
export const BK_CSRF_COOKIE_NAME = '__Host-bk_csrf';

export interface BkRefreshClaims {
  sub: string;
  jti: string;
  fid: string;
  type: 'refresh';
  iat?: number;
  exp: number;
}
