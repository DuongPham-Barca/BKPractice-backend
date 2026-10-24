export function readCookie(header: string | undefined, name: string): string | null {
  let found: string | null = null;
  for (const part of (header ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    if (found !== null) return null;
    found = part.slice(separator + 1).trim();
  }
  return found || null;
}

export function isAllowedBrowserOrigin(
  origin: string | undefined,
  referer: string | undefined,
  allowedOrigins: string,
): boolean {
  let source = origin;
  if (!source && referer) {
    try {
      source = new URL(referer).origin;
    } catch {
      return false;
    }
  }
  return !!source && allowedOrigins.split(',').some((allowed) => allowed.trim() === source);
}
