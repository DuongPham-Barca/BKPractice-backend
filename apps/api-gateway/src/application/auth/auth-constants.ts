import { BK_ACCESS_COOKIE_NAME, BK_CSRF_COOKIE_NAME, BK_REFRESH_COOKIE_NAME } from '@app/contracts';

export const AUTH_PUBLIC_ROUTES = new Set([
  'POST /api/auth/login',
  'GET /api/auth/microsoft',
  'GET /api/auth/microsoft/callback',
  'POST /api/auth/microsoft/exchange',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'GET /api/auth/csrf',
  'POST /api/auth/password/send-otp',
  'POST /api/auth/password/verify-otp',
  'POST /api/auth/password/reset',
]);

export const AUTH_ORIGIN_CHECKED_ROUTES = new Set([
  'POST /api/auth/login',
  'POST /api/auth/microsoft/exchange',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/auth/password/send-otp',
  'POST /api/auth/password/verify-otp',
  'POST /api/auth/password/reset',
]);

export const AUTH_COOKIE_REQUEST_ROUTES = new Set([
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'GET /api/auth/csrf',
]);

export const AUTH_COOKIE_RESPONSE_ROUTES = new Set([
  'POST /api/auth/login',
  'POST /api/auth/microsoft/exchange',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/auth/logout-all',
]);

export const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const PUBLIC_PROFILE_ROUTE =
  /^\/api\/users\/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\/profile$/;

export const AUTH_COOKIE_NAMES = {
  access: BK_ACCESS_COOKIE_NAME,
  refresh: BK_REFRESH_COOKIE_NAME,
  csrf: BK_CSRF_COOKIE_NAME,
} as const;
