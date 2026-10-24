import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProblemResultMapper } from './application/results/problem-result.mapper';
import { ProblemAuthorizationService } from './application/services/problem-authorization.service';
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
import { ContentFormatValidator } from './domain/services/content-format.validator';
import { ProblemContractValidator } from './domain/services/problem-contract.validator';
import { PublishValidator } from './domain/services/publish.validator';
import {
  Problem,
  StarterCode,
  TestCase,
  Topic,
  Tag,
  ProblemLanguage,
} from './entities/problem.entity';
import { RequestPrincipalProvider } from './infrastructure/auth/request-principal.provider';
import { ProblemPersistenceMapper } from './infrastructure/persistence/problem.persistence-mapper';
import { ProblemTypeOrmRepository } from './infrastructure/persistence/problem.typeorm-repository';
import { TopicTagTypeOrmReader } from './infrastructure/persistence/topic-tag.typeorm-reader';
import { TypeOrmTransactionContext } from './infrastructure/persistence/typeorm-transaction-context';
import { TypeOrmTransactionRunner } from './infrastructure/persistence/typeorm-transaction-runner';
import { InternalServiceGuard } from './internal-service.guard';
import { ProblemExceptionFilter } from './presentation/http/filters/problem-exception.filter';
import { ManagedProblemsController } from './presentation/http/managed-problems.controller';
import { ProblemRequestMapper } from './presentation/http/mappers/problem-request.mapper';
import { ProblemResponseMapper } from './presentation/http/mappers/problem-response.mapper';
import { PublicProblemsController } from './presentation/http/public-problems.controller';
import {
  PROBLEM_REPOSITORY,
  TOPIC_TAG_READER,
  TRANSACTION_RUNNER,
  PRINCIPAL_PROVIDER,
} from './problem.tokens';
import { ProblemsController } from './problems.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Problem, TestCase, StarterCode, ProblemLanguage, Topic, Tag]),
  ],
  controllers: [ManagedProblemsController, PublicProblemsController, ProblemsController],
  providers: [
    InternalServiceGuard,
    ProblemExceptionFilter,
    ContentFormatValidator,
    ProblemContractValidator,
    PublishValidator,
    ProblemAuthorizationService,
    ProblemResultMapper,
    CreateProblemUseCase,
    UpdateProblemUseCase,
    PublishProblemUseCase,
    HoldProblemUseCase,
    RepublishProblemUseCase,
    SoftDeleteProblemUseCase,
    RestoreProblemUseCase,
    GetPublicProblemUseCase,
    ListPublicProblemsUseCase,
    GetManagedProblemUseCase,
    ListManagedProblemsUseCase,
    PreviewProblemUseCase,
    ProblemRequestMapper,
    ProblemResponseMapper,
    ProblemPersistenceMapper,
    TypeOrmTransactionContext,
    TypeOrmTransactionRunner,
    ProblemTypeOrmRepository,
    TopicTagTypeOrmReader,
    RequestPrincipalProvider,
    { provide: PROBLEM_REPOSITORY, useExisting: ProblemTypeOrmRepository },
    { provide: TOPIC_TAG_READER, useExisting: TopicTagTypeOrmReader },
    { provide: TRANSACTION_RUNNER, useExisting: TypeOrmTransactionRunner },
    { provide: PRINCIPAL_PROVIDER, useExisting: RequestPrincipalProvider },
  ],
})
export class ProblemsModule {}
