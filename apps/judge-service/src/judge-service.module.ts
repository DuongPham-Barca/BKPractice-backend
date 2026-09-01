import { HealthModule, RabbitMqModule } from '@app/common';
import { validateEnvironment } from '@app/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { JudgeModule } from './modules/judge/judge.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment('judge-service') }),
    RabbitMqModule,
    JudgeModule,
    HealthModule.forService('judge-service'),
  ],
})
export class JudgeServiceModule {}
