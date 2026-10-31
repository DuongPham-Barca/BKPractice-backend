import { issueCsrfToken } from '@app/common';
import { BK_ACCESS_COOKIE_NAME, BK_CSRF_COOKIE_NAME, BK_REFRESH_COOKIE_NAME } from '@app/contracts';
import type { Response } from 'express';

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

const refreshCookieOptions = { ...cookieOptions, path: '/api/auth' };
const csrfCookieOptions = { ...cookieOptions, httpOnly: false };

export function setAccessCookie(response: Response, token: string, ttl: string): void {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) throw new Error('Invalid access token TTL');
  const seconds =
    Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  response.cookie(BK_ACCESS_COOKIE_NAME, token, { ...cookieOptions, maxAge: seconds * 1000 });
}

export function clearAccessCookie(response: Response): void {
  response.clearCookie(BK_ACCESS_COOKIE_NAME, cookieOptions);
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
  sid: string,
  accessTtl: string,
  refreshTtl: string,
  csrfSecret: string,
): void {
  setAccessCookie(response, accessToken, accessTtl);
  response.cookie(BK_REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: ttlMilliseconds(refreshTtl),
  });
  response.cookie(BK_CSRF_COOKIE_NAME, issueCsrfToken(sid, csrfSecret), {
    ...csrfCookieOptions,
    maxAge: ttlMilliseconds(refreshTtl),
  });
}

export function clearAuthCookies(response: Response): void {
  clearAccessCookie(response);
  response.clearCookie(BK_REFRESH_COOKIE_NAME, refreshCookieOptions);
  response.clearCookie(BK_CSRF_COOKIE_NAME, csrfCookieOptions);
}

function ttlMilliseconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) throw new Error('Invalid token TTL');
  return Number(match[1]) * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
}
