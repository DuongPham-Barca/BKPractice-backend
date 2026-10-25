import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import {
  BK_TOKEN_SERVICE,
  REFRESH_SESSION_REPOSITORY,
  type BkTokenService,
  type RefreshSessionRepository,
} from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import { AuthFailureFilter } from '@/modules/auth/presentation';
import { ProfileUseCases } from '@/modules/profiles/application';
import { ProfileFailureFilter } from '@/modules/profiles/presentation/profile-failure.filter';
import {
  AvatarUploadIntentDto,
  AvatarUploadIntentResponseDto,
  ProfileResponseDto,
  PublicProfileResponseDto,
  UpdateProfileDto,
} from '@/modules/profiles/presentation/profile.dto';
import { isRoleName, RoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

const gatewayCookieDescription =
  'Browsers send the HttpOnly access cookie to API Gateway; Gateway verifies it and forwards an internal Bearer token to Identity.';

@ApiTags('profile')
@ApiExtraModels(ProfileResponseDto, PublicProfileResponseDto)
@UseFilters(ProfileFailureFilter, AuthFailureFilter)
@ApiResponse({ status: 400, description: 'Invalid profile request' })
@ApiResponse({ status: 401, description: 'Authentication failed' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Profile unavailable' })
@ApiResponse({ status: 409, description: 'Official name unavailable for first profile creation' })
@ApiResponse({ status: 503, description: 'Profile dependency unavailable' })
@Controller('api')
export class ProfileController {
  constructor(
    private readonly profiles: ProfileUseCases,
    @Inject(BK_TOKEN_SERVICE) private readonly tokens: BkTokenService,
    @Inject(REFRESH_SESSION_REPOSITORY) private readonly sessions: RefreshSessionRepository,
  ) {}

  @Get('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read my profile', description: gatewayCookieDescription })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getMy(@Headers('authorization') authorization?: string): Promise<ProfileResponseDto> {
    return this.profiles.getMy((await this.verifyPrincipal(authorization)).userId);
  }

  @Patch('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile', description: gatewayCookieDescription })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateMy(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profiles.updateMy((await this.verifyPrincipal(authorization)).userId, dto);
  }

  @Get('users/:userId/profile')
  @ApiOperation({
    summary: 'Read a public profile, or an administrator view when authenticated',
    description:
      'Public response has only displayName, avatar and bio. A verified ADMIN access cookie at Gateway also receives userId and may read a locked or pending account profile. Identity receives an internal Bearer token.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PublicProfileResponseDto) },
        { $ref: getSchemaPath(ProfileResponseDto) },
      ],
    },
  })
  async getUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<PublicProfileResponseDto | ProfileResponseDto> {
    if (!authorization) return this.profiles.getPublic(userId);
    const principal = await this.verifyPrincipal(authorization);
    return principal.roles.includes(RoleName.Admin)
      ? this.profiles.adminGet(principal, userId)
      : this.profiles.getPublic(userId);
  }

  @Patch('users/:userId/profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an existing user profile (ADMIN only)',
    description: gatewayCookieDescription,
  })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profiles.adminUpdate(await this.verifyPrincipal(authorization), userId, dto);
  }

  @Post('profile/me/avatar/upload-url')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a signed R2 avatar upload intent',
    description: gatewayCookieDescription,
  })
  @ApiResponse({ status: 201, type: AvatarUploadIntentResponseDto })
  async createAvatarUploadIntent(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: AvatarUploadIntentDto,
  ): Promise<AvatarUploadIntentResponseDto> {
    return this.profiles.createAvatarUploadIntent(
      (await this.verifyPrincipal(authorization)).userId,
      dto.contentType,
      dto.size,
    );
  }

  private async verifyPrincipal(
    authorization: string | undefined,
  ): Promise<AuthorizationPrincipal> {
    if (!authorization || !/^Bearer [^\s]+$/.test(authorization))
      throw new AuthFailure('invalid_token');
    const claims = await this.tokens.verifyAccessClaims(authorization.slice(7));
    if (!claims.roles.every(isRoleName)) throw new AuthFailure('invalid_token');
    if (!(await this.sessions.isActive(claims.sub, claims.sid)))
      throw new AuthFailure('invalid_token');
    return { userId: claims.sub, roles: claims.roles, permissions: claims.permissions };
  }
}
