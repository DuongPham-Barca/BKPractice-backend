import { HealthModule } from '@app/common';
import { databaseOptions, validateEnvironment } from '@app/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { communityEntities } from './modules/community.entities';
import { PostsModule } from './modules/posts/posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment('community-service') }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        databaseOptions(config.getOrThrow<string>('COMMUNITY_DATABASE_URL'), communityEntities),
    }),
    PostsModule,
    HealthModule.forService('community-service'),
  ],
})
export class CommunityServiceModule {}
