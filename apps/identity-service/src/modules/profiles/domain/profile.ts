export interface ProfileRecord {
  profileId: string;
  userId: string;
  displayName: string;
  avatarReference: string | null;
  bio: string | null;
}

export interface ProfilePatch {
  displayName?: string;
  avatar?: string | null;
  bio?: string | null;
}

export class ProfileFailure extends Error {
  constructor(
    readonly code: 'invalid' | 'missing_name' | 'not_found' | 'forbidden' | 'dependency',
  ) {
    super(code);
  }
}

function trimText(value: unknown, maximum: number, nullable = false): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== 'string') throw new ProfileFailure('invalid');
  const trimmed = value.trim();
  if ((!nullable && !trimmed) || Array.from(trimmed).length > maximum) {
    throw new ProfileFailure('invalid');
  }
  return trimmed;
}

export function normalizeProfilePatch(value: unknown): ProfilePatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProfileFailure('invalid');
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['displayName', 'avatar', 'bio'].includes(key))) {
    throw new ProfileFailure('invalid');
  }
  const patch: ProfilePatch = {};
  if (Object.hasOwn(input, 'displayName')) {
    patch.displayName = trimText(input.displayName, 100) as string;
  }
  if (Object.hasOwn(input, 'avatar')) {
    if (input.avatar !== null && typeof input.avatar !== 'string') {
      throw new ProfileFailure('invalid');
    }
    patch.avatar = input.avatar;
  }
  if (Object.hasOwn(input, 'bio')) {
    patch.bio = trimText(input.bio, 1000, true);
  }
  return patch;
}

export function normalizeOfficialName(value: string | null): string {
  if (value === null) throw new ProfileFailure('missing_name');
  try {
    return trimText(value, 100) as string;
  } catch {
    throw new ProfileFailure('missing_name');
  }
}
