import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ANSWER_QUIZ_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/answer-quiz-question.port.in';
import { CLONE_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/clone-question.port.in';
import { CLONE_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/clone-quiz.port.in';
import { CREATE_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/create-question.port.in';
import { CREATE_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/create-quiz.port.in';
import { DELETE_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/delete-question.port.in';
import { DELETE_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/delete-quiz.port.in';
import { FINISH_QUIZ_ATTEMPT_PORT_IN } from '@/modules/quizzes/application/ports/in/finish-quiz-attempt.port.in';
import { GET_BANK_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/get-bank-question.port.in';
import { GET_MANAGED_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/get-managed-quiz.port.in';
import { GET_MY_QUIZ_ATTEMPT_PORT_IN } from '@/modules/quizzes/application/ports/in/get-my-quiz-attempt.port.in';
import { GET_MY_QUIZ_COMPLETION_PORT_IN } from '@/modules/quizzes/application/ports/in/get-my-quiz-completion.port.in';
import { GET_MY_QUIZ_RESULT_PORT_IN } from '@/modules/quizzes/application/ports/in/get-my-quiz-result.port.in';
import { GET_PUBLISHED_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/get-published-quiz.port.in';
import { HOLD_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/hold-quiz.port.in';
import { LIST_BANK_QUESTIONS_PORT_IN } from '@/modules/quizzes/application/ports/in/list-bank-questions.port.in';
import { LIST_MANAGED_QUIZZES_PORT_IN } from '@/modules/quizzes/application/ports/in/list-managed-quizzes.port.in';
import { LIST_MY_QUIZ_ATTEMPTS_PORT_IN } from '@/modules/quizzes/application/ports/in/list-my-quiz-attempts.port.in';
import { LIST_QUESTION_USAGE_PORT_IN } from '@/modules/quizzes/application/ports/in/list-question-usage.port.in';
import { PREVIEW_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/preview-quiz.port.in';
import { PUBLISH_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/publish-quiz.port.in';
import { REPLACE_QUIZ_QUESTIONS_PORT_IN } from '@/modules/quizzes/application/ports/in/replace-quiz-questions.port.in';
import { REPUBLISH_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/republish-quiz.port.in';
import { RESTORE_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/restore-question.port.in';
import { RESTORE_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/restore-quiz.port.in';
import { REVISE_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/revise-question.port.in';
import { SHARE_QUESTION_PORT_IN } from '@/modules/quizzes/application/ports/in/share-question.port.in';
import { SHARE_QUIZ_PORT_IN } from '@/modules/quizzes/application/ports/in/share-quiz.port.in';
import { START_QUIZ_ATTEMPT_PORT_IN } from '@/modules/quizzes/application/ports/in/start-quiz-attempt.port.in';
import { UPDATE_QUIZ_DRAFT_PORT_IN } from '@/modules/quizzes/application/ports/in/update-quiz-draft.port.in';
import {
  BankTaxonomyReader,
  QuestionRepository,
  QuizAttemptRepository,
  QuizCourseAccessReader,
  QuizReferenceReader,
  QuizRepository,
  ShareRecipientReader,
} from '@/modules/quizzes/application/ports/out';
import { QuizAuthorizationService } from '@/modules/quizzes/application/services';
import { AnswerQuizQuestionUseCase } from '@/modules/quizzes/application/use-cases/answer-quiz-question.use-case';
import { CloneQuestionUseCase } from '@/modules/quizzes/application/use-cases/clone-question.use-case';
import { CloneQuizUseCase } from '@/modules/quizzes/application/use-cases/clone-quiz.use-case';
import { CreateQuestionUseCase } from '@/modules/quizzes/application/use-cases/create-question.use-case';
import { CreateQuizUseCase } from '@/modules/quizzes/application/use-cases/create-quiz.use-case';
import { DeleteQuestionUseCase } from '@/modules/quizzes/application/use-cases/delete-question.use-case';
import { DeleteQuizUseCase } from '@/modules/quizzes/application/use-cases/delete-quiz.use-case';
import { FinishQuizAttemptUseCase } from '@/modules/quizzes/application/use-cases/finish-quiz-attempt.use-case';
import { GetBankQuestionUseCase } from '@/modules/quizzes/application/use-cases/get-bank-question.use-case';
import { GetManagedQuizUseCase } from '@/modules/quizzes/application/use-cases/get-managed-quiz.use-case';
import { GetMyQuizAttemptUseCase } from '@/modules/quizzes/application/use-cases/get-my-quiz-attempt.use-case';
import { GetMyQuizCompletionUseCase } from '@/modules/quizzes/application/use-cases/get-my-quiz-completion.use-case';
import { GetMyQuizResultUseCase } from '@/modules/quizzes/application/use-cases/get-my-quiz-result.use-case';
import { GetPublishedQuizUseCase } from '@/modules/quizzes/application/use-cases/get-published-quiz.use-case';
import { HoldQuizUseCase } from '@/modules/quizzes/application/use-cases/hold-quiz.use-case';
import { ListBankQuestionsUseCase } from '@/modules/quizzes/application/use-cases/list-bank-questions.use-case';
import { ListManagedQuizzesUseCase } from '@/modules/quizzes/application/use-cases/list-managed-quizzes.use-case';
import { ListMyQuizAttemptsUseCase } from '@/modules/quizzes/application/use-cases/list-my-quiz-attempts.use-case';
import { ListQuestionUsageUseCase } from '@/modules/quizzes/application/use-cases/list-question-usage.use-case';
import { PreviewQuizUseCase } from '@/modules/quizzes/application/use-cases/preview-quiz.use-case';
import { PublishQuizUseCase } from '@/modules/quizzes/application/use-cases/publish-quiz.use-case';
import { ReplaceQuizQuestionsUseCase } from '@/modules/quizzes/application/use-cases/replace-quiz-questions.use-case';
import { RepublishQuizUseCase } from '@/modules/quizzes/application/use-cases/republish-quiz.use-case';
import { RestoreQuestionUseCase } from '@/modules/quizzes/application/use-cases/restore-question.use-case';
import { RestoreQuizUseCase } from '@/modules/quizzes/application/use-cases/restore-quiz.use-case';
import { ReviseQuestionUseCase } from '@/modules/quizzes/application/use-cases/revise-question.use-case';
import { ShareQuestionUseCase } from '@/modules/quizzes/application/use-cases/share-question.use-case';
import { ShareQuizUseCase } from '@/modules/quizzes/application/use-cases/share-quiz.use-case';
import { StartQuizAttemptUseCase } from '@/modules/quizzes/application/use-cases/start-quiz-attempt.use-case';
import { UpdateQuizDraftUseCase } from '@/modules/quizzes/application/use-cases/update-quiz-draft.use-case';
import {
  AttemptTypeOrmRepository,
  QuestionTypeOrmRepository,
  QuizTransactionContext,
  QuizTypeOrmRepository,
} from '@/modules/quizzes/infrastructure/persistence';
import {
  BankQuestionEntity,
  BankQuestionRevisionEntity,
  QuestionGrantEntity,
  QuizAnswerEntity,
  QuizAttemptEntity,
  QuizEntity,
  QuizGrantEntity,
  QuizItemEntity,
  QuizRevisionEntity,
} from '@/modules/quizzes/infrastructure/persistence/quiz.entities';
import {
  BankTaxonomyTypeOrmReader,
  QuizCourseTypeOrmReader,
  QuizReferenceTypeOrmReader,
  ShareRecipientHttpReader,
} from '@/modules/quizzes/infrastructure/readers';
import {
  BankQuestionsController,
  LearnerQuizzesController,
  ManagedQuizzesController,
} from '@/modules/quizzes/presentation/http';
import { QUIZ_TRANSACTION_RUNNER } from '@/modules/quizzes/quiz.tokens';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankQuestionEntity,
      BankQuestionRevisionEntity,
      QuizEntity,
      QuizRevisionEntity,
      QuizItemEntity,
      QuestionGrantEntity,
      QuizGrantEntity,
      QuizAttemptEntity,
      QuizAnswerEntity,
    ]),
  ],
  controllers: [BankQuestionsController, ManagedQuizzesController, LearnerQuizzesController],
  providers: [
    QuizAuthorizationService,
    QuizTransactionContext,
    QuestionTypeOrmRepository,
    QuizTypeOrmRepository,
    AttemptTypeOrmRepository,
    QuizCourseTypeOrmReader,
    BankTaxonomyTypeOrmReader,
    QuizReferenceTypeOrmReader,
    ShareRecipientHttpReader,
    { provide: QUIZ_TRANSACTION_RUNNER, useExisting: QuizTransactionContext },
    { provide: QuestionRepository, useExisting: QuestionTypeOrmRepository },
    { provide: QuizRepository, useExisting: QuizTypeOrmRepository },
    { provide: QuizAttemptRepository, useExisting: AttemptTypeOrmRepository },
    { provide: QuizCourseAccessReader, useExisting: QuizCourseTypeOrmReader },
    { provide: BankTaxonomyReader, useExisting: BankTaxonomyTypeOrmReader },
    { provide: QuizReferenceReader, useExisting: QuizReferenceTypeOrmReader },
    { provide: ShareRecipientReader, useExisting: ShareRecipientHttpReader },
    CreateQuestionUseCase,
    { provide: CREATE_QUESTION_PORT_IN, useExisting: CreateQuestionUseCase },
    ReviseQuestionUseCase,
    { provide: REVISE_QUESTION_PORT_IN, useExisting: ReviseQuestionUseCase },
    ListBankQuestionsUseCase,
    { provide: LIST_BANK_QUESTIONS_PORT_IN, useExisting: ListBankQuestionsUseCase },
    GetBankQuestionUseCase,
    { provide: GET_BANK_QUESTION_PORT_IN, useExisting: GetBankQuestionUseCase },
    ListQuestionUsageUseCase,
    { provide: LIST_QUESTION_USAGE_PORT_IN, useExisting: ListQuestionUsageUseCase },
    ShareQuestionUseCase,
    { provide: SHARE_QUESTION_PORT_IN, useExisting: ShareQuestionUseCase },
    CloneQuestionUseCase,
    { provide: CLONE_QUESTION_PORT_IN, useExisting: CloneQuestionUseCase },
    CreateQuizUseCase,
    { provide: CREATE_QUIZ_PORT_IN, useExisting: CreateQuizUseCase },
    ListManagedQuizzesUseCase,
    { provide: LIST_MANAGED_QUIZZES_PORT_IN, useExisting: ListManagedQuizzesUseCase },
    GetManagedQuizUseCase,
    { provide: GET_MANAGED_QUIZ_PORT_IN, useExisting: GetManagedQuizUseCase },
    UpdateQuizDraftUseCase,
    { provide: UPDATE_QUIZ_DRAFT_PORT_IN, useExisting: UpdateQuizDraftUseCase },
    ReplaceQuizQuestionsUseCase,
    { provide: REPLACE_QUIZ_QUESTIONS_PORT_IN, useExisting: ReplaceQuizQuestionsUseCase },
    PreviewQuizUseCase,
    { provide: PREVIEW_QUIZ_PORT_IN, useExisting: PreviewQuizUseCase },
    PublishQuizUseCase,
    { provide: PUBLISH_QUIZ_PORT_IN, useExisting: PublishQuizUseCase },
    ShareQuizUseCase,
    { provide: SHARE_QUIZ_PORT_IN, useExisting: ShareQuizUseCase },
    CloneQuizUseCase,
    { provide: CLONE_QUIZ_PORT_IN, useExisting: CloneQuizUseCase },
    GetPublishedQuizUseCase,
    { provide: GET_PUBLISHED_QUIZ_PORT_IN, useExisting: GetPublishedQuizUseCase },
    StartQuizAttemptUseCase,
    { provide: START_QUIZ_ATTEMPT_PORT_IN, useExisting: StartQuizAttemptUseCase },
    GetMyQuizAttemptUseCase,
    { provide: GET_MY_QUIZ_ATTEMPT_PORT_IN, useExisting: GetMyQuizAttemptUseCase },
    AnswerQuizQuestionUseCase,
    { provide: ANSWER_QUIZ_QUESTION_PORT_IN, useExisting: AnswerQuizQuestionUseCase },
    FinishQuizAttemptUseCase,
    { provide: FINISH_QUIZ_ATTEMPT_PORT_IN, useExisting: FinishQuizAttemptUseCase },
    GetMyQuizResultUseCase,
    { provide: GET_MY_QUIZ_RESULT_PORT_IN, useExisting: GetMyQuizResultUseCase },
    ListMyQuizAttemptsUseCase,
    { provide: LIST_MY_QUIZ_ATTEMPTS_PORT_IN, useExisting: ListMyQuizAttemptsUseCase },
    GetMyQuizCompletionUseCase,
    { provide: GET_MY_QUIZ_COMPLETION_PORT_IN, useExisting: GetMyQuizCompletionUseCase },
    DeleteQuestionUseCase,
    { provide: DELETE_QUESTION_PORT_IN, useExisting: DeleteQuestionUseCase },
    RestoreQuestionUseCase,
    { provide: RESTORE_QUESTION_PORT_IN, useExisting: RestoreQuestionUseCase },
    HoldQuizUseCase,
    { provide: HOLD_QUIZ_PORT_IN, useExisting: HoldQuizUseCase },
    RepublishQuizUseCase,
    { provide: REPUBLISH_QUIZ_PORT_IN, useExisting: RepublishQuizUseCase },
    DeleteQuizUseCase,
    { provide: DELETE_QUIZ_PORT_IN, useExisting: DeleteQuizUseCase },
    RestoreQuizUseCase,
    { provide: RESTORE_QUIZ_PORT_IN, useExisting: RestoreQuizUseCase },
  ],
  exports: [QuizReferenceReader],
})
export class QuizzesModule {}
