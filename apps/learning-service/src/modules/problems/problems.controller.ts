import type { SupportedLanguage } from '@app/contracts';
import {
  BUILD_JUDGE_PACKAGE_PORT_IN,
  type IBuildJudgePackagePortIn,
} from '@learning/modules/problems/application/ports/in/build-judge-package.port.in';
import type { JudgePackageResult } from '@learning/modules/problems/application/results/test-case.results';
import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

import { InternalServiceGuard } from './internal-service.guard';

@ApiTags('problems')
@Controller()
export class ProblemsController {
  constructor(
    @Inject(BUILD_JUDGE_PACKAGE_PORT_IN)
    private readonly buildJudgePackage: IBuildJudgePackagePortIn,
  ) {}

  @Get('internal/problems/:id/judge-package/:language')
  @UseGuards(InternalServiceGuard)
  @ApiExcludeEndpoint()
  async judgePackage(
    @Param('id') id: string,
    @Param('language') language: SupportedLanguage,
  ): Promise<JudgePackageResult> {
    return this.buildJudgePackage.execute(id, language);
  }
}
