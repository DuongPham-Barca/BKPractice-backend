import type { JudgeTestCase, ProblemType, SupportedLanguage } from '@app/contracts';
import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Problem, PublishStatus, StarterCode, TestCase } from './entities/problem.entity';
import { InternalServiceGuard } from './internal-service.guard';

interface JudgePackage {
  problemId: string;
  problemType: ProblemType;
  timeLimitMs: number;
  memoryLimitMb: number;
  hiddenHarness?: string;
  testCases: JudgeTestCase[];
}

@ApiTags('problems')
@Controller()
export class ProblemsController {
  constructor(
    @InjectRepository(Problem) private readonly problems: Repository<Problem>,
    @InjectRepository(TestCase) private readonly testCases: Repository<TestCase>,
    @InjectRepository(StarterCode) private readonly starterCodes: Repository<StarterCode>,
  ) {}

  @Get('api/problems')
  list(): Promise<Problem[]> {
    return this.problems.find({
      where: { publishStatus: PublishStatus.Published },
      relations: { topics: true, tags: true, languages: true, starterCodes: true },
      order: { createdAt: 'DESC' },
    });
  }

  @Get('internal/problems/:id/judge-package/:language')
  @UseGuards(InternalServiceGuard)
  @ApiExcludeEndpoint()
  async judgePackage(
    @Param('id') id: string,
    @Param('language') language: SupportedLanguage,
  ): Promise<JudgePackage> {
    const problem = await this.problems.findOneBy({ id });
    if (!problem) throw new NotFoundException('Problem not found');
    const [cases, starter] = await Promise.all([
      this.testCases.find({ where: { problem: { id } }, order: { displayOrder: 'ASC' } }),
      this.starterCodes
        .createQueryBuilder('starter')
        .addSelect('starter.hiddenHarness')
        .where('starter.problem_id = :id', { id })
        .andWhere('starter.language = :language', { language })
        .getOne(),
    ]);
    return {
      problemId: problem.id,
      problemType: problem.problemType,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      hiddenHarness: starter?.hiddenHarness ?? undefined,
      testCases: cases.map((testCase) => ({
        id: testCase.id,
        stdin: testCase.input,
        expectedOutput: testCase.expectedOutput,
        score: testCase.score,
      })),
    };
  }
}
