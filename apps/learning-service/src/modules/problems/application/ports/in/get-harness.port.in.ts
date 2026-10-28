import type { SupportedLanguage } from '@app/contracts';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { HarnessResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IGetHarnessPortIn {
  execute(
    principal: Principal,
    problemId: string,
    language: SupportedLanguage,
  ): Promise<HarnessResult>;
}

export const GET_HARNESS_PORT_IN = Symbol('GET_HARNESS_PORT_IN');
