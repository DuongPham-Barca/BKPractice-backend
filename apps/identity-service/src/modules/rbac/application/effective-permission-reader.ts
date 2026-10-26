export const EFFECTIVE_PERMISSION_READER = Symbol('EffectivePermissionReader');

export interface EffectivePermissionReader {
  readForUser(userId: string): Promise<string[]>;
}
