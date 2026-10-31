import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function issueCsrfToken(sid: string, secret: string): string {
  const nonce = randomBytes(32).toString('base64url');
  return `${nonce}.${sign(sid, nonce, secret)}`;
}

export function verifyCsrfToken(
  sid: string,
  cookie: string | null,
  header: string | undefined,
  secret: string,
): boolean {
  if (!cookie || !header || cookie.length !== header.length) return false;
  const cookieBytes = Buffer.from(cookie);
  if (!timingSafeEqual(cookieBytes, Buffer.from(header))) return false;
  const match = /^([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(cookie);
  if (!match?.[1] || !match[2]) return false;
  const actual = Buffer.from(match[2]);
  return timingSafeEqual(actual, Buffer.from(sign(sid, match[1], secret)));
}

function sign(sid: string, nonce: string, secret: string): string {
  return createHmac('sha256', secret).update(`${sid}:${nonce}`).digest('base64url');
}
