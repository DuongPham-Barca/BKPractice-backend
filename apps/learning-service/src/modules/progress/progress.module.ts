import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Progress } from './entities/progress.entity';
import { ProgressConsumer } from './progress.consumer';

@Module({ imports: [TypeOrmModule.forFeature([Progress])], providers: [ProgressConsumer] })
export class ProgressModule {}
