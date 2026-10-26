import { RequestIdMiddleware } from '@app/common';
import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { JwtBkTokenService } from '@/modules/auth/infrastructure/security';
import {
  AUTHORIZATION_PRINCIPAL_PROVIDER,
  RBAC_REPOSITORY,
  RBAC_TRANSACTION_RUNNER,
  EFFECTIVE_PERMISSION_READER,
  AssignRoleToUser,
  RevokeRoleFromUser,
  GetUserRoles,
  EvaluateAuthorization,
  type RbacRepository,
} from '@/modules/rbac/application';
import {
  BkAuthorizationPrincipalProvider,
  TypeormRbacRepository,
  TypeormRbacTransactionRunner,
  TypeormEffectivePermissionReader,
} from '@/modules/rbac/infrastructure';
import { RbacController, RbacGuard } from '@/modules/rbac/presentation';

@Module({
  controllers: [RbacController],
  providers: [
    RbacGuard,
    JwtBkTokenService,
    {
      provide: AUTHORIZATION_PRINCIPAL_PROVIDER,
      inject: [JwtBkTokenService],
      useFactory: (tokens: JwtBkTokenService) => new BkAuthorizationPrincipalProvider(tokens),
    },
    {
      provide: RBAC_REPOSITORY,
      inject: [DataSource],
      useFactory: (database: DataSource) => new TypeormRbacRepository(database.manager),
    },
    TypeormRbacTransactionRunner,
    { provide: RBAC_TRANSACTION_RUNNER, useExisting: TypeormRbacTransactionRunner },
    {
      provide: GetUserRoles,
      inject: [RBAC_REPOSITORY],
      useFactory: (repository: RbacRepository) => new GetUserRoles(repository),
    },
    {
      provide: AssignRoleToUser,
      inject: [RBAC_TRANSACTION_RUNNER],
      useFactory: (transactions: TypeormRbacTransactionRunner) =>
        new AssignRoleToUser(transactions),
    },
    {
      provide: RevokeRoleFromUser,
      inject: [RBAC_TRANSACTION_RUNNER],
      useFactory: (transactions: TypeormRbacTransactionRunner) =>
        new RevokeRoleFromUser(transactions),
    },
    { provide: EvaluateAuthorization, useFactory: () => new EvaluateAuthorization() },
    TypeormEffectivePermissionReader,
    {
      provide: EFFECTIVE_PERMISSION_READER,
      useExisting: TypeormEffectivePermissionReader,
    },
  ],
  exports: [EFFECTIVE_PERMISSION_READER, EvaluateAuthorization],
})
export class RbacModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(RbacController);
  }
}
