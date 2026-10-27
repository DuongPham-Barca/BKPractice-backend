import { readCookie } from '@app/common';
import { BK_ACCESS_COOKIE_NAME } from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthFailure } from '@/modules/auth/domain';
import { AuthFailureFilter, IdentityAccessAuthenticator } from '@/modules/auth/presentation';
import { ProfileUseCases } from '@/modules/profiles/application';
import { ProfileFailureFilter } from '@/modules/profiles/presentation/profile-failure.filter';
import {
  AvatarUploadIntentDto,
  AvatarUploadIntentResponseDto,
  ProfileResponseDto,
  PublicProfileResponseDto,
  UpdateProfileDto,
} from '@/modules/profiles/presentation/profile.dto';
import { RoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

const accessDescription =
  'Web browsers send the HttpOnly access cookie; apps send a Bearer access token. Cookie writes require Origin and X-CSRF-Token.';

@ApiTags('profile')
@ApiExtraModels(ProfileResponseDto, PublicProfileResponseDto)
@UseFilters(ProfileFailureFilter, AuthFailureFilter)
@ApiResponse({ status: 400, description: 'Invalid profile request' })
@ApiResponse({ status: 401, description: 'Authentication failed' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Profile unavailable' })
@ApiResponse({
  status: 409,
  description: 'Initial display name unavailable for first profile creation',
})
@ApiResponse({ status: 503, description: 'Profile dependency unavailable' })
@Controller('api')
export class ProfileController {
  constructor(
    private readonly profiles: ProfileUseCases,
    private readonly access: IdentityAccessAuthenticator,
  ) {}

  @Get('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read my profile', description: accessDescription })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getMy(@Req() request: Request): Promise<ProfileResponseDto> {
    return this.profiles.getMy((await this.verifyPrincipal(request)).userId);
  }

  @Patch('profile/me')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: false,
    description: 'Required for web cookie PATCH; use the token from GET /api/auth/csrf.',
  })
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      displayNameOnly: {
        summary: 'Update display name only',
        value: { displayName: 'Dũng Quốc' },
      },
      clearBio: { summary: 'Clear bio only', value: { bio: null } },
    },
  })
  @ApiOperation({ summary: 'Update my profile', description: accessDescription })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateMy(
    @Req() request: Request,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profiles.updateMy((await this.verifyPrincipal(request)).userId, dto);
  }

  @Get('users/:userId/profile')
  @ApiOperation({
    summary: 'Read a public profile, or an administrator view when authenticated',
    description:
      'Public response has only displayName, avatar and bio. A verified ADMIN access cookie or Bearer token receives the administrator view.',
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
    @Req() request: Request,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<PublicProfileResponseDto | ProfileResponseDto> {
    if (
      !request.header('authorization') &&
      !readCookie(request.header('cookie'), BK_ACCESS_COOKIE_NAME)
    )
      return this.profiles.getPublic(userId);
    let principal: AuthorizationPrincipal;
    try {
      principal = await this.verifyPrincipal(request);
    } catch (error) {
      if (request.header('authorization') || !(error instanceof AuthFailure)) throw error;
      return this.profiles.getPublic(userId);
    }
    return principal.roles.includes(RoleName.Admin)
      ? this.profiles.adminGet(principal, userId)
      : this.profiles.getPublic(userId);
  }

  @Patch('users/:userId/profile')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: false,
    description: 'Required for web cookie PATCH; use the token from GET /api/auth/csrf.',
  })
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      displayNameOnly: {
        summary: 'Update display name only',
        value: { displayName: 'Dũng Quốc' },
      },
      clearBio: { summary: 'Clear bio only', value: { bio: null } },
    },
  })
  @ApiOperation({
    summary: 'Update an existing user profile (ADMIN only)',
    description: accessDescription,
  })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateUser(
    @Req() request: Request,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profiles.adminUpdate(await this.verifyPrincipal(request), userId, dto);
  }

  @Post('profile/me/avatar/upload-url')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a signed R2 avatar upload intent',
    description: accessDescription,
  })
  @ApiResponse({ status: 201, type: AvatarUploadIntentResponseDto })
  async createAvatarUploadIntent(
    @Req() request: Request,
    @Body() dto: AvatarUploadIntentDto,
  ): Promise<AvatarUploadIntentResponseDto> {
    return this.profiles.createAvatarUploadIntent(
      (await this.verifyPrincipal(request)).userId,
      dto.contentType,
      dto.size,
    );
  }

  private async verifyPrincipal(request: Request): Promise<AuthorizationPrincipal> {
    const claims = await this.access.verify(request);
    return { userId: claims.sub, roles: claims.roles, permissions: claims.permissions };
  }
}
