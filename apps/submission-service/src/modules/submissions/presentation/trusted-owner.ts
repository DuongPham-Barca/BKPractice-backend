import { UnauthorizedException } from '@nestjs/common';

// The Gateway strips any client-sent x-auth-user-id and sets it from the verified access token.
export function requireTrustedOwner(userId: string | undefined): string {
  if (!userId) throw new UnauthorizedException('Missing authenticated user context');
  return userId;
}
