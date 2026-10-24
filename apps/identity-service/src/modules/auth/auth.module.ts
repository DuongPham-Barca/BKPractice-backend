import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  AUTH_ACCOUNT_REPOSITORY,
  AUTH_FLOW_STORE,
  BK_TOKEN_SERVICE,
  EXTERNAL_IDENTITY_REPOSITORY,
  MICROSOFT_IDENTITY_PROVIDER,
  PASSWORD_HASHER,
  REFRESH_SESSION_REPOSITORY,
  AuthTokenIssuer,
  CompleteMicrosoftLogin,
  ExchangeMicrosoftLoginCode,
  GetCurrentAuthenticatedUser,
  LoginWithStudentId,
  LogoutCurrentSession,
  RefreshSession,
  StartMicrosoftLogin,
  type AuthAccountRepository,
  type AuthFlowStore,
  type BkTokenService,
  type ExternalIdentityRepository,
  type MicrosoftIdentityProvider,
  type PasswordHasher,
  type RefreshSessionRepository,
} from '@/modules/auth/application';
import {
  Argon2PasswordHasher,
  ExternalIdentity,
  JwtBkTokenService,
  MemoryAuthFlowStore,
  MsalMicrosoftIdentityProvider,
  RedisAuthFlowStore,
  TypeormAuthAccountRepository,
  TypeormExternalIdentityRepository,
  TypeormRefreshSessionRepository,
} from '@/modules/auth/infrastructure';
import { AuthController } from '@/modules/auth/presentation';
import type { EffectivePermissionReader } from '@/modules/rbac/application/effective-permission-reader';
import { EFFECTIVE_PERMISSION_READER } from '@/modules/rbac/application/effective-permission-reader';
import { RbacModule } from '@/modules/rbac/rbac.module';
import { RefreshToken } from '@/modules/users/entities/refresh-token.entity';
import { User } from '@/modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, ExternalIdentity]), RbacModule],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_ACCOUNT_REPOSITORY, useClass: TypeormAuthAccountRepository },
    { provide: EXTERNAL_IDENTITY_REPOSITORY, useClass: TypeormExternalIdentityRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: BK_TOKEN_SERVICE, useClass: JwtBkTokenService },
    { provide: MICROSOFT_IDENTITY_PROVIDER, useClass: MsalMicrosoftIdentityProvider },
    {
      provide: AUTH_FLOW_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AuthFlowStore =>
        config.getOrThrow<'redis' | 'memory'>('AUTH_FLOW_STORE') === 'memory'
          ? new MemoryAuthFlowStore()
          : new RedisAuthFlowStore(config),
    },
    {
      provide: REFRESH_SESSION_REPOSITORY,
      inject: [DataSource, PASSWORD_HASHER],
      useFactory: (dataSource: DataSource, hasher: PasswordHasher) =>
        new TypeormRefreshSessionRepository(dataSource, hasher),
    },
    {
      provide: AuthTokenIssuer,
      inject: [
        BK_TOKEN_SERVICE,
        PASSWORD_HASHER,
        REFRESH_SESSION_REPOSITORY,
        EFFECTIVE_PERMISSION_READER,
      ],
      useFactory: (
        tokens: BkTokenService,
        hasher: PasswordHasher,
        sessions: RefreshSessionRepository,
        permissions: EffectivePermissionReader,
      ) => new AuthTokenIssuer(tokens, hasher, sessions, permissions),
    },
    {
      provide: LoginWithStudentId,
      inject: [AUTH_ACCOUNT_REPOSITORY, PASSWORD_HASHER, AuthTokenIssuer],
      useFactory: (
        accounts: AuthAccountRepository,
        hasher: PasswordHasher,
        issuer: AuthTokenIssuer,
      ) => new LoginWithStudentId(accounts, hasher, issuer),
    },
    {
      provide: StartMicrosoftLogin,
      inject: [MICROSOFT_IDENTITY_PROVIDER, AUTH_FLOW_STORE],
      useFactory: (provider: MicrosoftIdentityProvider, flows: AuthFlowStore) =>
        new StartMicrosoftLogin(provider, flows),
    },
    {
      provide: CompleteMicrosoftLogin,
      inject: [
        MICROSOFT_IDENTITY_PROVIDER,
        AUTH_FLOW_STORE,
        EXTERNAL_IDENTITY_REPOSITORY,
        ConfigService,
      ],
      useFactory: (
        provider: MicrosoftIdentityProvider,
        flows: AuthFlowStore,
        identities: ExternalIdentityRepository,
        config: ConfigService,
      ) =>
        new CompleteMicrosoftLogin(
          provider,
          flows,
          identities,
          config.getOrThrow<string>('AUTH_WEB_LOGIN_REDIRECT_URL'),
        ),
    },
    {
      provide: ExchangeMicrosoftLoginCode,
      inject: [AUTH_FLOW_STORE, AUTH_ACCOUNT_REPOSITORY, AuthTokenIssuer],
      useFactory: (
        flows: AuthFlowStore,
        accounts: AuthAccountRepository,
        issuer: AuthTokenIssuer,
      ) => new ExchangeMicrosoftLoginCode(flows, accounts, issuer),
    },
    {
      provide: RefreshSession,
      inject: [
        BK_TOKEN_SERVICE,
        AUTH_ACCOUNT_REPOSITORY,
        REFRESH_SESSION_REPOSITORY,
        AuthTokenIssuer,
      ],
      useFactory: (
        tokens: BkTokenService,
        accounts: AuthAccountRepository,
        sessions: RefreshSessionRepository,
        issuer: AuthTokenIssuer,
      ) => new RefreshSession(tokens, accounts, sessions, issuer),
    },
    {
      provide: LogoutCurrentSession,
      inject: [BK_TOKEN_SERVICE, REFRESH_SESSION_REPOSITORY],
      useFactory: (tokens: BkTokenService, sessions: RefreshSessionRepository) =>
        new LogoutCurrentSession(tokens, sessions),
    },
    {
      provide: GetCurrentAuthenticatedUser,
      inject: [AUTH_ACCOUNT_REPOSITORY],
      useFactory: (accounts: AuthAccountRepository) => new GetCurrentAuthenticatedUser(accounts),
    },
  ],
  exports: [BK_TOKEN_SERVICE],
})
export class AuthModule {}
