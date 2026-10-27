import { CREATE_PROBLEM_PORT_IN } from './application/ports/in/create-problem.port.in';
import { GET_MANAGED_PROBLEM_PORT_IN } from './application/ports/in/get-managed-problem.port.in';
import { GET_PUBLIC_PROBLEM_PORT_IN } from './application/ports/in/get-public-problem.port.in';
import { HOLD_PROBLEM_PORT_IN } from './application/ports/in/hold-problem.port.in';
import { LIST_MANAGED_PROBLEMS_PORT_IN } from './application/ports/in/list-managed-problems.port.in';
import { LIST_PUBLIC_PROBLEMS_PORT_IN } from './application/ports/in/list-public-problems.port.in';
import { PREVIEW_PROBLEM_PORT_IN } from './application/ports/in/preview-problem.port.in';
import { PUBLISH_PROBLEM_PORT_IN } from './application/ports/in/publish-problem.port.in';
import { REPUBLISH_PROBLEM_PORT_IN } from './application/ports/in/republish-problem.port.in';
import { RESTORE_PROBLEM_PORT_IN } from './application/ports/in/restore-problem.port.in';
import { SOFT_DELETE_PROBLEM_PORT_IN } from './application/ports/in/soft-delete-problem.port.in';
import { UPDATE_PROBLEM_PORT_IN } from './application/ports/in/update-problem.port.in';
import { CreateProblemUseCase } from './application/use-cases/create-problem.use-case';
import { GetManagedProblemUseCase } from './application/use-cases/get-managed-problem.use-case';
import { GetPublicProblemUseCase } from './application/use-cases/get-public-problem.use-case';
import { HoldProblemUseCase } from './application/use-cases/hold-problem.use-case';
import { ListManagedProblemsUseCase } from './application/use-cases/list-managed-problems.use-case';
import { ListPublicProblemsUseCase } from './application/use-cases/list-public-problems.use-case';
import { PreviewProblemUseCase } from './application/use-cases/preview-problem.use-case';
import { PublishProblemUseCase } from './application/use-cases/publish-problem.use-case';
import { RepublishProblemUseCase } from './application/use-cases/republish-problem.use-case';
import { RestoreProblemUseCase } from './application/use-cases/restore-problem.use-case';
import { SoftDeleteProblemUseCase } from './application/use-cases/soft-delete-problem.use-case';
import { UpdateProblemUseCase } from './application/use-cases/update-problem.use-case';
import { ManagedProblemsController } from './presentation/http/managed-problems.controller';
import { PublicProblemsController } from './presentation/http/public-problems.controller';
import { ProblemsModule } from './problems.module';

interface ModuleProvider {
  readonly provide: unknown;
  readonly useExisting?: unknown;
}

interface SelfParam {
  readonly index: number;
  readonly param: unknown;
}

const INBOUND_BINDINGS = [
  [CREATE_PROBLEM_PORT_IN, CreateProblemUseCase],
  [UPDATE_PROBLEM_PORT_IN, UpdateProblemUseCase],
  [PUBLISH_PROBLEM_PORT_IN, PublishProblemUseCase],
  [HOLD_PROBLEM_PORT_IN, HoldProblemUseCase],
  [REPUBLISH_PROBLEM_PORT_IN, RepublishProblemUseCase],
  [SOFT_DELETE_PROBLEM_PORT_IN, SoftDeleteProblemUseCase],
  [RESTORE_PROBLEM_PORT_IN, RestoreProblemUseCase],
  [GET_PUBLIC_PROBLEM_PORT_IN, GetPublicProblemUseCase],
  [LIST_PUBLIC_PROBLEMS_PORT_IN, ListPublicProblemsUseCase],
  [GET_MANAGED_PROBLEM_PORT_IN, GetManagedProblemUseCase],
  [LIST_MANAGED_PROBLEMS_PORT_IN, ListManagedProblemsUseCase],
  [PREVIEW_PROBLEM_PORT_IN, PreviewProblemUseCase],
] as const;

function injectedTokens(controller: object): unknown[] {
  const params = (Reflect.getMetadata('self:paramtypes', controller) ?? []) as SelfParam[];
  return [...params].sort((left, right) => left.index - right.index).map(({ param }) => param);
}

describe('ProblemsModule inbound port wiring', () => {
  it.each(INBOUND_BINDINGS)('binds %p to %p', (token, useCase) => {
    const providers = (Reflect.getMetadata('providers', ProblemsModule) ?? []) as ModuleProvider[];

    expect(providers).toContainEqual({ provide: token, useExisting: useCase });
  });

  it('wires managed controller to inbound port tokens', () => {
    expect(injectedTokens(ManagedProblemsController)).toEqual([
      CREATE_PROBLEM_PORT_IN,
      UPDATE_PROBLEM_PORT_IN,
      PUBLISH_PROBLEM_PORT_IN,
      HOLD_PROBLEM_PORT_IN,
      REPUBLISH_PROBLEM_PORT_IN,
      SOFT_DELETE_PROBLEM_PORT_IN,
      RESTORE_PROBLEM_PORT_IN,
      GET_MANAGED_PROBLEM_PORT_IN,
      LIST_MANAGED_PROBLEMS_PORT_IN,
      PREVIEW_PROBLEM_PORT_IN,
    ]);
  });

  it('wires public controller to inbound port tokens', () => {
    expect(injectedTokens(PublicProblemsController)).toEqual([
      GET_PUBLIC_PROBLEM_PORT_IN,
      LIST_PUBLIC_PROBLEMS_PORT_IN,
    ]);
  });
});
