import { BK_ACCESS_COOKIE_NAME } from '@app/contracts';
import type { Response } from 'express';

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

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
