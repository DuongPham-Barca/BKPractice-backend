export function validatePermissionCode(code: string): boolean {
  return code.length <= 64 && /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(code);
}

export function collectEffectivePermissions(codes: string[]): string[] {
  return [...new Set(codes.filter(validatePermissionCode))].sort();
}
