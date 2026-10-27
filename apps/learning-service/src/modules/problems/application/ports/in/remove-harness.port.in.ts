import type { SupportedLanguage } from '@app/contracts';
import type { Principal } from '@learning/modules/problems/application/models/principal';

export interface IRemoveHarnessPortIn {
  execute(principal: Principal, problemId: string, language: SupportedLanguage): Promise<void>;
}

export const REMOVE_HARNESS_PORT_IN = Symbol('REMOVE_HARNESS_PORT_IN');
