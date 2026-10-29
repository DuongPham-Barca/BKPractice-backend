import { HealthModule } from '@app/common';
import { databaseOptions, validateEnvironment } from '@app/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@/modules/auth';
import { identityEntities } from '@/modules/identity.entities';
import { ProfileModule } from '@/modules/profiles';
import { UsersModule } from '@/modules/users';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment('identity-service') }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        databaseOptions(config.getOrThrow<string>('IDENTITY_DATABASE_URL'), identityEntities),
    }),
    JwtModule.register({ global: true }),
    AuthModule,
    ProfileModule,
    UsersModule,
    HealthModule.forService('identity-service'),
  ],
})
export class IdentityServiceModule {}
