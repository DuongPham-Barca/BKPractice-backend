import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
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
  CLONE_QUESTION_PORT_IN,
  type ICloneQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/clone-question.port.in';
import {
  CREATE_QUESTION_PORT_IN,
  type ICreateQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/create-question.port.in';
import {
  DELETE_QUESTION_PORT_IN,
  type IDeleteQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/delete-question.port.in';
import {
  GET_BANK_QUESTION_PORT_IN,
  type IGetBankQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/get-bank-question.port.in';
import {
  LIST_BANK_QUESTIONS_PORT_IN,
  type IListBankQuestionsPortIn,
} from '@/modules/quizzes/application/ports/in/list-bank-questions.port.in';
import {
  LIST_QUESTION_USAGE_PORT_IN,
  type IListQuestionUsagePortIn,
} from '@/modules/quizzes/application/ports/in/list-question-usage.port.in';
import {
  RESTORE_QUESTION_PORT_IN,
  type IRestoreQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/restore-question.port.in';
import {
  REVISE_QUESTION_PORT_IN,
  type IReviseQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/revise-question.port.in';
import {
  SHARE_QUESTION_PORT_IN,
  type IShareQuestionPortIn,
} from '@/modules/quizzes/application/ports/in/share-question.port.in';
import type { Principal } from '@/modules/quizzes/domain';
import {
  BankQuestionPageDto,
  ManagedQuestionDto,
  QuizUsageDto,
} from '@/modules/quizzes/presentation/http/dto';
import {
  CreateQuestionDto,
  QuestionInputDto,
  QuizPageQueryDto,
  RequestIdDto,
  ShareDto,
} from '@/modules/quizzes/presentation/http/dto';
import { QuizExceptionFilter } from '@/modules/quizzes/presentation/http/quiz-exception.filter';

@ApiTags('bank-questions')
@ApiBearerAuth()
@ApiBadRequestResponse()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@ApiConflictResponse()
@ApiUnauthorizedResponse()
@UseGuards(TrustedPrincipalGuard)
@UseFilters(QuizExceptionFilter)
@Controller('api/question-bank/questions')
export class BankQuestionsController {
  constructor(
    @Inject(LIST_BANK_QUESTIONS_PORT_IN)
    private readonly listBankQuestions: IListBankQuestionsPortIn,
    @Inject(CREATE_QUESTION_PORT_IN) private readonly createQuestion: ICreateQuestionPortIn,
    @Inject(GET_BANK_QUESTION_PORT_IN) private readonly getBankQuestion: IGetBankQuestionPortIn,
    @Inject(LIST_QUESTION_USAGE_PORT_IN)
    private readonly listQuestionUsage: IListQuestionUsagePortIn,
    @Inject(REVISE_QUESTION_PORT_IN) private readonly reviseQuestion: IReviseQuestionPortIn,
    @Inject(SHARE_QUESTION_PORT_IN) private readonly shareQuestion: IShareQuestionPortIn,
    @Inject(CLONE_QUESTION_PORT_IN) private readonly cloneQuestion: ICloneQuestionPortIn,
    @Inject(DELETE_QUESTION_PORT_IN) private readonly deleteQuestion: IDeleteQuestionPortIn,
    @Inject(RESTORE_QUESTION_PORT_IN) private readonly restoreQuestion: IRestoreQuestionPortIn,
  ) {}
  @Get('')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ListBankQuestions',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: BankQuestionPageDto })
  listBankQuestionsRequest(@TrustedPrincipal() p: Principal, @Query() query: QuizPageQueryDto) {
    return this.listBankQuestions.execute(p, query);
  }
  @Post('')
  @HttpCode(201)
  @ApiOperation({
    summary: 'CreateQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiCreatedResponse({ type: ManagedQuestionDto })
  createQuestionRequest(@TrustedPrincipal() p: Principal, @Body() body: CreateQuestionDto) {
    return this.createQuestion.execute(p, {
      content: body.content,
      explanation: body.explanation,
      options: body.options,
      difficulty: body.difficulty,
      topicIds: body.topicIds,
      tagIds: body.tagIds,
      clientRequestId: body.clientRequestId,
    });
  }
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'GetBankQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuestionDto })
  getBankQuestionRequest(@TrustedPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string) {
    return this.getBankQuestion.execute(p, id.toLowerCase());
  }
  @Get(':id/usage')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ListQuestionUsage',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: QuizUsageDto, isArray: true })
  listQuestionUsageRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listQuestionUsage.execute(p, id.toLowerCase());
  }
  @Post(':id/revisions')
  @HttpCode(201)
  @ApiOperation({
    summary: 'ReviseQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiCreatedResponse({ type: ManagedQuestionDto })
  reviseQuestionRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: QuestionInputDto,
  ) {
    return this.reviseQuestion.execute(p, id.toLowerCase(), body);
  }
  @Put(':id/shares')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ShareQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ description: 'Completed; empty response body.' })
  shareQuestionRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ShareDto,
  ) {
    return this.shareQuestion.execute(p, id.toLowerCase(), body);
  }
  @Post(':id/clone')
  @HttpCode(201)
  @ApiOperation({
    summary: 'CloneQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiCreatedResponse({ type: ManagedQuestionDto })
  cloneQuestionRequest(
    @TrustedPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RequestIdDto,
  ) {
    return this.cloneQuestion.execute(p, id.toLowerCase(), body.clientRequestId);
  }
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'DeleteQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuestionDto })
  deleteQuestionRequest(@TrustedPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteQuestion.execute(p, id.toLowerCase());
  }
  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({
    summary: 'RestoreQuestion',
    description: 'Requires management role, action permission and ownership/sharing scope.',
  })
  @ApiOkResponse({ type: ManagedQuestionDto })
  restoreQuestionRequest(@TrustedPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string) {
    return this.restoreQuestion.execute(p, id.toLowerCase());
  }
}
