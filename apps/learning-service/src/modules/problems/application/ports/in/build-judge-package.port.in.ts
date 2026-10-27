import type { SupportedLanguage } from '@app/contracts';
import type { JudgePackageResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IBuildJudgePackagePortIn {
  execute(problemId: string, language: SupportedLanguage): Promise<JudgePackageResult>;
}

export const BUILD_JUDGE_PACKAGE_PORT_IN = Symbol('BUILD_JUDGE_PACKAGE_PORT_IN');
