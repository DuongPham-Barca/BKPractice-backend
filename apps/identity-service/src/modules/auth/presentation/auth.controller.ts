import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import {
  BK_TOKEN_SERVICE,
  CompleteMicrosoftLogin,
  ExchangeMicrosoftLoginCode,
  GetCurrentAuthenticatedUser,
  LoginWithStudentId,
  LogoutCurrentSession,
  RefreshSession,
  StartMicrosoftLogin,
  type BkTokenService,
} from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import { clearAccessCookie, setAccessCookie } from '@/modules/auth/presentation/auth-cookie';
import { AuthFailureFilter } from '@/modules/auth/presentation/auth-failure.filter';
import {
  AuthenticatedResponseDto,
  CurrentAuthUserResponseDto,
  MicrosoftCallbackDto,
  MicrosoftExchangeDto,
  RefreshTokenDto,
  StudentLoginDto,
  TokenPairResponseDto,
} from '@/modules/auth/presentation/auth.dto';

@ApiTags('auth')
@UseFilters(AuthFailureFilter)
@ApiResponse({ status: 400, description: 'Invalid request shape' })
@ApiResponse({ status: 401, description: 'Authentication failed' })
@ApiResponse({ status: 503, description: 'Authentication dependency unavailable' })
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginWithStudentId,
    private readonly startMicrosoftUseCase: StartMicrosoftLogin,
    private readonly completeMicrosoftUseCase: CompleteMicrosoftLogin,
    private readonly exchangeMicrosoftUseCase: ExchangeMicrosoftLoginCode,
    private readonly refreshUseCase: RefreshSession,
    private readonly logoutUseCase: LogoutCurrentSession,
    private readonly currentUserUseCase: GetCurrentAuthenticatedUser,
    @Inject(BK_TOKEN_SERVICE) private readonly tokens: BkTokenService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with a provisioned student ID and password' })
  @ApiResponse({
    status: 200,
    type: AuthenticatedResponseDto,
  })
  async login(
    @Body() dto: StudentLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedResponseDto> {
    const result = await this.loginUseCase.execute(dto.studentId, dto.password);
    setAccessCookie(response, result.accessToken, this.config.getOrThrow<string>('JWT_ACCESS_TTL'));
    return { userId: result.userId, refreshToken: result.refreshToken };
  }

  @Get('microsoft')
  @ApiOperation({ summary: 'Redirect to the configured school Microsoft tenant' })
  @ApiResponse({ status: 302, description: 'Microsoft authorization redirect' })
  async startMicrosoft(@Res() response: Response): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.startMicrosoftUseCase.execute());
  }

  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Complete Microsoft sign-in and redirect with a one-time code' })
  @ApiResponse({ status: 302, description: 'Frontend redirect containing a one-time login code' })
  async completeMicrosoft(
    @Query() query: MicrosoftCallbackDto,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(
      HttpStatus.FOUND,
      await this.completeMicrosoftUseCase.execute({
        code: query.code,
        state: query.state,
        error: query.error,
      }),
    );
  }

  @Post('microsoft/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a Microsoft login code within 60 seconds, once' })
  @ApiResponse({
    status: 200,
    type: AuthenticatedResponseDto,
  })
  async exchangeMicrosoft(
    @Body() dto: MicrosoftExchangeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedResponseDto> {
    const result = await this.exchangeMicrosoftUseCase.execute(dto.loginCode);
    setAccessCookie(response, result.accessToken, this.config.getOrThrow<string>('JWT_ACCESS_TTL'));
    return { userId: result.userId, refreshToken: result.refreshToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token within its session family' })
  @ApiResponse({
    status: 200,
    type: TokenPairResponseDto,
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenPairResponseDto> {
    const result = await this.refreshUseCase.execute(dto.refreshToken);
    setAccessCookie(response, result.accessToken, this.config.getOrThrow<string>('JWT_ACCESS_TTL'));
    return { refreshToken: result.refreshToken };
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the submitted refresh token family' })
  @ApiResponse({ status: 204, description: 'Current refresh family revoked' })
  async logout(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logoutUseCase.execute(await this.verifyBearer(authorization), dto.refreshToken);
    clearAccessCookie(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read the current authenticated user' })
  @ApiResponse({ status: 200, type: CurrentAuthUserResponseDto })
  async currentUser(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<CurrentAuthUserResponseDto> {
    return this.currentUserUseCase.execute(await this.verifyBearer(authorization));
  }

  private verifyBearer(authorization: string | undefined): Promise<string> {
    if (!authorization || !/^Bearer [^\s]+$/.test(authorization))
      throw new AuthFailure('invalid_token');
    return this.tokens.verifyAccess(authorization.slice(7));
  }
}
