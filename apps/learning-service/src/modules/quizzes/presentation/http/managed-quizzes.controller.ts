import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { TrustedPrincipal } from '@/modules/problems/presentation/http/decorators/trusted-principal.decorator';
import { TrustedPrincipalGuard } from '@/modules/problems/presentation/http/guards/trusted-principal.guard';
import {
  CLONE_QUIZ_PORT_IN,
  type ICloneQuizPortIn,
} from '@/modules/quizzes/application/ports/in/clone-quiz.port.in';
import {
  CREATE_QUIZ_PORT_IN,
  type ICreateQuizPortIn,
} from '@/modules/quizzes/application/ports/in/create-quiz.port.in';
import {
  DELETE_QUIZ_PORT_IN,
  type IDeleteQuizPortIn,
} from '@/modules/quizzes/application/ports/in/delete-quiz.port.in';
import {
  GET_MANAGED_QUIZ_PORT_IN,
  type IGetManagedQuizPortIn,
} from '@/modules/quizzes/application/ports/in/get-managed-quiz.port.in';
import {
  HOLD_QUIZ_PORT_IN,
  type IHoldQuizPortIn,
} from '@/modules/quizzes/application/ports/in/hold-quiz.port.in';
import {
  LIST_MANAGED_QUIZZES_PORT_IN,
  type IListManagedQuizzesPortIn,
} from '@/modules/quizzes/application/ports/in/list-managed-quizzes.port.in';
import {
  PREVIEW_QUIZ_PORT_IN,
  type IPreviewQuizPortIn,
} from '@/modules/quizzes/application/ports/in/preview-quiz.port.in';
import {
  PUBLISH_QUIZ_PORT_IN,
  type IPublishQuizPortIn,
} from '@/modules/quizzes/application/ports/in/publish-quiz.port.in';
import {
  REPLACE_QUIZ_QUESTIONS_PORT_IN,
  type IReplaceQuizQuestionsPortIn,
} from '@/modules/quizzes/application/ports/in/replace-quiz-questions.port.in';
import {
  REPUBLISH_QUIZ_PORT_IN,
  type IRepublishQuizPortIn,
} from '@/modules/quizzes/application/ports/in/republish-quiz.port.in';
import {
  RESTORE_QUIZ_PORT_IN,
  type IRestoreQuizPortIn,
} from '@/modules/quizzes/application/ports/in/restore-quiz.port.in';
import {
  SHARE_QUIZ_PORT_IN,
  type IShareQuizPortIn,
} from '@/modules/quizzes/application/ports/in/share-quiz.port.in';
import {
  UPDATE_QUIZ_DRAFT_PORT_IN,
  type IUpdateQuizDraftPortIn,
} from '@/modules/quizzes/application/ports/in/update-quiz-draft.port.in';
import type { Principal } from '@/modules/quizzes/domain';
import { EmptyQuizBodyDto } from '@/modules/quizzes/presentation/http/dto';
import {
  ManagedQuizDto,
  ManagedQuizPageDto,
  QuizPreviewDto,
} from '@/modules/quizzes/presentation/http/dto';
import {
  CreateQuizDto,
  QuizPageQueryDto,
  RequestIdDto,
  SelectQuestionsDto,
  ShareDto,
  UpdateQuizDto,
} from '@/modules/quizzes/presentation/http/dto';
import { QuizExceptionFilter } from '@/modules/quizzes/presentation/http/quiz-exception.filter';

@ApiTags('managed-quizzes')
@ApiBearerAuth()
@ApiBadRequestResponse()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@ApiConflictResponse()
@ApiUnauthorizedResponse()
@UseGuards(TrustedPrincipalGuard)
@UseFilters(QuizExceptionFilter)
@Controller('api/quizzes')
export class ManagedQuizzesController {
  constructor(
    @Inject(LIST_MANAGED_QUIZZES_PORT_IN)
    private readonly listManagedQuizzes: IListManagedQuizzesPortIn,
    @Inject(GET_MANAGED_QUIZ_PORT_IN) private readonly getManagedQuiz: IGetManagedQuizPortIn,
    @Inject(CREATE_QUIZ_PORT_IN) private readonly createQuiz: ICreateQuizPortIn,
    @Inject(UPDATE_QUIZ_DRAFT_PORT_IN) private readonly updateQuizDraft: IUpdateQuizDraftPortIn,
    @Inject(REPLACE_QUIZ_QUESTIONS_PORT_IN)
    private readonly replaceQuizQuestions: IReplaceQuizQuestionsPortIn,
    @Inject(PREVIEW_QUIZ_PORT_IN) private readonly previewQuiz: IPreviewQuizPortIn,
    @Inject(PUBLISH_QUIZ_PORT_IN) private readonly publishQuiz: IPublishQuizPortIn,
    @Inject(SHARE_QUIZ_PORT_IN) private readonly shareQuiz: IShareQuizPortIn,
    @Inject(CLONE_QUIZ_PORT_IN) private readonly cloneQuiz: ICloneQuizPortIn,
    @Inject(HOLD_QUIZ_PORT_IN) private readonly holdQuiz: IHoldQuizPortIn,
    @Inject(REPUBLISH_QUIZ_PORT_IN) private readonly republishQuiz: IRepublishQuizPortIn,
    @Inject(DELETE_QUIZ_PORT_IN) private readonly deleteQuiz: IDeleteQuizPortIn,
    @Inject(RESTORE_QUIZ_PORT_IN) private readonly restoreQuiz: IRestoreQuizPortIn,
  ) {}
  @Get('managed')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ListManagedQuizzes',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizPageDto })
  listManagedQuizzesRequest(@TrustedPrincipal() p: Principal, @Query() query: QuizPageQueryDto) {
    return this.listManagedQuizzes.execute(p, query);
  }
  @Get('managed/:id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'GetManagedQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  getManagedQuizRequest(@TrustedPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string) {
    return this.getManagedQuiz.execute(p, id.toLowerCase());
  }
  @Post('')
  @HttpCode(201)
  @ApiOperation({
    summary: 'CreateQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiCreatedResponse({ type: ManagedQuizDto })
  createQuizRequest(@TrustedPrincipal() p: Principal, @Body() body: CreateQuizDto) {
    return this.createQuiz.execute(p, {
      title: body.title,
      description: body.description,
      clientRequestId: body.clientRequestId,
    });
  }
  @Patch(':id/draft')
  @HttpCode(200)
  @ApiOperation({
    summary: 'UpdateQuizDraft',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  updateQuizDraftRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateQuizDto,
  ) {
    return this.updateQuizDraft.execute(p, id.toLowerCase(), body);
  }
  @Put(':id/draft/questions')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ReplaceQuizQuestions',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  replaceQuizQuestionsRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SelectQuestionsDto,
  ) {
    return this.replaceQuizQuestions.execute(
      p,
      id.toLowerCase(),
      body.items.map((i) => ({ questionId: i.questionId, questionRevisionId: i.revisionId })),
    );
  }
  @Post(':id/preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'PreviewQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: QuizPreviewDto })
  previewQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: EmptyQuizBodyDto,
  ) {
    return this.previewQuiz.execute(p, id.toLowerCase());
  }
  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'PublishQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  publishQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: EmptyQuizBodyDto,
  ) {
    return this.publishQuiz.execute(p, id.toLowerCase());
  }
  @Put(':id/shares')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ShareQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ description: 'Completed; empty response body.' })
  shareQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ShareDto,
  ) {
    return this.shareQuiz.execute(p, id.toLowerCase(), body);
  }
  @Post(':id/clone')
  @HttpCode(201)
  @ApiOperation({
    summary: 'CloneQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiCreatedResponse({ type: ManagedQuizDto })
  cloneQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RequestIdDto,
  ) {
    return this.cloneQuiz.execute(p, id.toLowerCase(), body.clientRequestId);
  }
  @Post(':id/hold')
  @HttpCode(200)
  @ApiOperation({
    summary: 'HoldQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  holdQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: EmptyQuizBodyDto,
  ) {
    return this.holdQuiz.execute(p, id.toLowerCase());
  }
  @Post(':id/republish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'RepublishQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  republishQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: EmptyQuizBodyDto,
  ) {
    return this.republishQuiz.execute(p, id.toLowerCase());
  }
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'DeleteQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  deleteQuizRequest(@TrustedPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteQuiz.execute(p, id.toLowerCase());
  }
  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({
    summary: 'RestoreQuiz',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuizDto })
  restoreQuizRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: EmptyQuizBodyDto,
  ) {
    return this.restoreQuiz.execute(p, id.toLowerCase());
  }
}
