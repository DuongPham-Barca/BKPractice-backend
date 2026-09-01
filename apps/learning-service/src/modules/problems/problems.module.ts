import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Problem, StarterCode, TestCase } from './entities/problem.entity';
import { InternalServiceGuard } from './internal-service.guard';
import { ProblemsController } from './problems.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Problem, TestCase, StarterCode])],
  controllers: [ProblemsController],
  providers: [InternalServiceGuard],
})
export class ProblemsModule {}
