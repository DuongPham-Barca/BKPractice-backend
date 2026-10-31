export enum RoleName {
  Student = 'STUDENT',
  Lecturer = 'LECTURER',
  Admin = 'ADMIN',
}

export function isRoleName(value: unknown): value is RoleName {
  return Object.values(RoleName).some((role) => role === value);
}
