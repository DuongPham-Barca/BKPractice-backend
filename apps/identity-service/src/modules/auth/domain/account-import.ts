import { evaluatePermission, RoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

export const ACCOUNT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const ACCOUNT_IMPORT_MAX_ROWS = 1000;

export interface ImportIssue {
  row: number;
  field: 'mssv' | 'name' | 'email' | 'role' | 'row';
  code: string;
}

export interface AccountImportRow {
  row: number;
  studentId: string | null;
  displayName: string;
  email: string;
  role: RoleName.Student | RoleName.Lecturer;
}

export interface RawAccountImportRow {
  row: number;
  values: unknown[];
}

export class AccountImportFailure extends Error {
  constructor(
    readonly code:
      'invalid_file' | 'invalid_rows' | 'conflict' | 'dependency_unavailable' | 'forbidden',
    readonly issues: ImportIssue[] = [],
    readonly totalRows = 0,
  ) {
    super(code);
  }
}

export function requireAccountImport(principal: AuthorizationPrincipal): void {
  if (
    !principal.roles.includes(RoleName.Admin) ||
    !evaluatePermission(principal, 'user:import').allowed
  )
    throw new AccountImportFailure('forbidden');
}

export function validateAccountImport(input: RawAccountImportRow[]): AccountImportRow[] {
  const issues: ImportIssue[] = [];
  const result: AccountImportRow[] = [];
  const emails = new Map<string, number>();
  const studentIds = new Map<string, number>();
  for (const { row, values } of input) {
    const [rawId, rawName, rawEmail, role] = values;
    const studentId =
      typeof rawId === 'string'
        ? rawId.trim()
        : typeof rawId === 'number' && Number.isSafeInteger(rawId) && rawId >= 0
          ? String(rawId)
          : '';
    const displayName = typeof rawName === 'string' ? rawName.trim() : '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const emailDomain =
      role === RoleName.Student
        ? 'sv1.dut.udn.vn'
        : role === RoleName.Lecturer
          ? 'dut.udn.vn'
          : null;
    const invalid = (field: ImportIssue['field'], code: string): void => {
      issues.push({ row, field, code });
    };
    if (values.length > 4) invalid('row', 'unexpected_columns');
    if (!displayName || displayName.length > 100 || /\p{Cc}/u.test(displayName))
      invalid('name', 'invalid_name');
    if (
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (emailDomain !== null && !email.endsWith(`@${emailDomain}`))
    )
      invalid('email', 'invalid_email');
    if (role !== RoleName.Student && role !== RoleName.Lecturer) invalid('role', 'invalid_role');
    if (role === RoleName.Student && (!studentId || studentId.length > 64 || /\s/.test(studentId)))
      invalid('mssv', 'invalid_student_id');
    if (role === RoleName.Lecturer && rawId !== null && rawId !== undefined && rawId !== '')
      invalid('mssv', 'lecturer_student_id_must_be_empty');
    for (const [field, key, seen] of [
      ['email', email, emails],
      ['mssv', studentId, studentIds],
    ] as const) {
      if (!key) continue;
      const previous = seen.get(key);
      if (previous !== undefined) {
        issues.push({ row: previous, field, code: 'duplicate_in_file' });
        invalid(field, 'duplicate_in_file');
      }
      seen.set(key, row);
    }
    if (role === RoleName.Student || role === RoleName.Lecturer)
      result.push({
        row,
        studentId: role === RoleName.Student ? studentId : null,
        displayName,
        email,
        role,
      });
  }
  if (issues.length)
    throw new AccountImportFailure(
      'invalid_rows',
      [
        ...new Map(
          issues.map((issue) => [`${issue.row}:${issue.field}:${issue.code}`, issue]),
        ).values(),
      ],
      input.length,
    );
  return result;
}
