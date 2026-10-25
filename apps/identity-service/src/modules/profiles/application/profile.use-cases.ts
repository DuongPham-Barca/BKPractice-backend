import type {
  AvatarStorage,
  IdentityProfileContext,
  ProfileRepository,
} from '@/modules/profiles/application/ports';
import {
  normalizeProfilePatch,
  ProfileFailure,
  type ProfileRecord,
} from '@/modules/profiles/domain';
import { requireAdmin, type AuthorizationPrincipal } from '@/modules/rbac/domain';

export interface PrivateProfile {
  userId: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
}

export type PublicProfile = Omit<PrivateProfile, 'userId'>;

export class ProfileUseCases {
  constructor(
    private readonly accounts: IdentityProfileContext,
    private readonly profiles: ProfileRepository,
    private readonly avatars: AvatarStorage,
  ) {}

  async getMy(userId: string): Promise<PrivateProfile> {
    const account = await this.requireAccount(userId);
    return this.toPrivate(await this.profiles.loadOrCreate(userId, account.officialName));
  }

  async updateMy(userId: string, input: unknown): Promise<PrivateProfile> {
    const account = await this.requireAccount(userId);
    return this.update(userId, account.officialName, input, true);
  }

  async getPublic(userId: string): Promise<PublicProfile> {
    const account = await this.accounts.findAccount(userId);
    if (!account || account.status !== 'ACTIVE') throw new ProfileFailure('not_found');
    const profile = await this.profiles.find(userId);
    if (!profile) throw new ProfileFailure('not_found');
    const result = await this.toPrivate(profile);
    return { displayName: result.displayName, avatar: result.avatar, bio: result.bio };
  }

  async adminGet(principal: AuthorizationPrincipal, userId: string): Promise<PrivateProfile> {
    requireAdmin(principal);
    await this.requireAccount(userId);
    const profile = await this.profiles.find(userId);
    if (!profile) throw new ProfileFailure('not_found');
    return this.toPrivate(profile);
  }

  async adminUpdate(
    principal: AuthorizationPrincipal,
    userId: string,
    input: unknown,
  ): Promise<PrivateProfile> {
    requireAdmin(principal);
    await this.requireAccount(userId);
    return this.update(userId, null, input, false);
  }

  async createAvatarUploadIntent(
    userId: string,
    contentType: string,
    size: number,
  ): Promise<Awaited<ReturnType<AvatarStorage['createUploadIntent']>>> {
    await this.requireAccount(userId);
    return this.avatars.createUploadIntent(userId, contentType, size);
  }

  private async update(
    userId: string,
    officialName: string | null,
    input: unknown,
    createIfMissing: boolean,
  ): Promise<PrivateProfile> {
    const patch = normalizeProfilePatch(input);
    if (patch.avatar !== undefined && patch.avatar !== null) {
      await this.avatars.verifyReference(userId, patch.avatar);
    }
    const { profile, replacedAvatar } = await this.profiles.update(
      userId,
      officialName,
      patch,
      createIfMissing,
    );
    if (replacedAvatar) this.avatars.scheduleCleanup(replacedAvatar);
    return this.toPrivate(profile);
  }

  private async requireAccount(userId: string) {
    const account = await this.accounts.findAccount(userId);
    if (!account) throw new ProfileFailure('not_found');
    return account;
  }

  private async toPrivate(profile: ProfileRecord): Promise<PrivateProfile> {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatar: profile.avatarReference
        ? await this.avatars.signReadUrl(profile.userId, profile.avatarReference)
        : null,
      bio: profile.bio,
    };
  }
}
