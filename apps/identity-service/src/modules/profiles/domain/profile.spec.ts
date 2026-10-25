import {
  normalizeOfficialName,
  normalizeProfilePatch,
  ProfileFailure,
} from '@/modules/profiles/domain';

describe('Profile domain', () => {
  it('trims Unicode text without changing its content or omitted fields', () => {
    expect(
      normalizeProfilePatch({ displayName: '  Nguyễn Văn A  ', bio: '  Xin chào 👋  ' }),
    ).toEqual({
      displayName: 'Nguyễn Văn A',
      bio: 'Xin chào 👋',
    });
    expect(normalizeProfilePatch({ bio: null })).toEqual({ bio: null });
    expect(normalizeProfilePatch({})).toEqual({});
    expect(normalizeOfficialName('  Trần Bình  ')).toBe('Trần Bình');
  });

  it('enforces text limits after trimming', () => {
    expect(normalizeProfilePatch({ displayName: 'a'.repeat(100), bio: 'b'.repeat(1000) })).toEqual({
      displayName: 'a'.repeat(100),
      bio: 'b'.repeat(1000),
    });
    for (const patch of [
      { displayName: ' ' },
      { displayName: null },
      { displayName: 'a'.repeat(101) },
      { bio: 'b'.repeat(1001) },
      { avatar: 1 },
      { email: 'bad@example.edu' },
      { roles: ['ADMIN'] },
      { password: 'secret' },
    ]) {
      expect(() => normalizeProfilePatch(patch)).toThrow(ProfileFailure);
    }
    expect(() => normalizeOfficialName(null)).toThrow('missing_name');
  });
});
