import { RequestIdMiddleware } from '@app/common';
import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { AuthModule } from '@/modules/auth';
import { USER_MANAGEMENT_REPOSITORY, UserManagementUseCases, type UserManagementRepository } from '@/modules/users/application';
import { TypeormUserManagementRepository } from '@/modules/users/infrastructure/persistence';
import { UserManagementController } from '@/modules/users/presentation';

@Module({
  imports: [AuthModule],
  controllers: [UserManagementController],
  providers: [
    TypeormUserManagementRepository,
    { provide: USER_MANAGEMENT_REPOSITORY, useExisting: TypeormUserManagementRepository },
    {
      provide: UserManagementUseCases,
      inject: [USER_MANAGEMENT_REPOSITORY],
      useFactory: (users: UserManagementRepository) => new UserManagementUseCases(users),
    },
  ],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(UserManagementController);
  }
}
