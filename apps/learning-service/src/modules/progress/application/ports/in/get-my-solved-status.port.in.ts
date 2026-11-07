import type { Principal } from '@/modules/progress/application/models';
import type { SolvedStatusResult } from '@/modules/progress/application/results';
export interface IGetMySolvedStatusPortIn {
  execute(
    principal: Principal,
    problemIds: readonly string[],
  ): Promise<readonly SolvedStatusResult[]>;
}
export const GET_MY_SOLVED_STATUS_PORT_IN = Symbol('GET_MY_SOLVED_STATUS_PORT_IN');
