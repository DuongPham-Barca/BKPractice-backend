import type { Principal } from '@learning/modules/problems/application/models/principal';
import {
  ADD_TEST_CASE_PORT_IN,
  type IAddTestCasePortIn,
} from '@learning/modules/problems/application/ports/in/add-test-case.port.in';
import {
  GET_HARNESS_PORT_IN,
  type IGetHarnessPortIn,
} from '@learning/modules/problems/application/ports/in/get-harness.port.in';
import {
  GET_TEST_CASE_PORT_IN,
  type IGetTestCasePortIn,
} from '@learning/modules/problems/application/ports/in/get-test-case.port.in';
import {
  LIST_TEST_CASES_PORT_IN,
  type IListTestCasesPortIn,
} from '@learning/modules/problems/application/ports/in/list-test-cases.port.in';
import {
  REMOVE_HARNESS_PORT_IN,
  type IRemoveHarnessPortIn,
} from '@learning/modules/problems/application/ports/in/remove-harness.port.in';
import {
  REMOVE_TEST_CASE_PORT_IN,
  type IRemoveTestCasePortIn,
} from '@learning/modules/problems/application/ports/in/remove-test-case.port.in';
import {
  REORDER_TEST_CASES_PORT_IN,
  type IReorderTestCasesPortIn,
} from '@learning/modules/problems/application/ports/in/reorder-test-cases.port.in';
import {
  SET_HARNESS_PORT_IN,
  type ISetHarnessPortIn,
} from '@learning/modules/problems/application/ports/in/set-harness.port.in';
import {
  UPDATE_TEST_CASE_PORT_IN,
  type IUpdateTestCasePortIn,
} from '@learning/modules/problems/application/ports/in/update-test-case.port.in';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { TrustedPrincipal } from './decorators/trusted-principal.decorator';
import {
  HarnessResponseDto,
  TestCaseListResponseDto,
  TestCaseResponseDto,
  toTestSuiteSummaryDto,
} from './dto/test-case-response.dto';
import {
  AddTestCaseRequestDto,
  HarnessLanguageParamDto,
  ReorderTestCasesRequestDto,
  SetHarnessRequestDto,
  UpdateTestCaseRequestDto,
} from './dto/test-case.request.dto';
import { ProblemExceptionFilter } from './filters/problem-exception.filter';
import { ProblemRequestMapper } from './mappers/problem-request.mapper';

@ApiTags('problems')
@ApiBearerAuth()
@UseFilters(ProblemExceptionFilter)
@Controller('api/problems')
export class ManagedTestCasesController {
  constructor(
    @Inject(ADD_TEST_CASE_PORT_IN)
    private readonly addTestCase: IAddTestCasePortIn,
    @Inject(UPDATE_TEST_CASE_PORT_IN)
    private readonly updateTestCase: IUpdateTestCasePortIn,
    @Inject(REMOVE_TEST_CASE_PORT_IN)
    private readonly removeTestCase: IRemoveTestCasePortIn,
    @Inject(REORDER_TEST_CASES_PORT_IN)
    private readonly reorderTestCases: IReorderTestCasesPortIn,
    @Inject(LIST_TEST_CASES_PORT_IN)
    private readonly listTestCases: IListTestCasesPortIn,
    @Inject(GET_TEST_CASE_PORT_IN)
    private readonly getTestCase: IGetTestCasePortIn,
    @Inject(SET_HARNESS_PORT_IN)
    private readonly setHarness: ISetHarnessPortIn,
    @Inject(REMOVE_HARNESS_PORT_IN)
    private readonly removeHarness: IRemoveHarnessPortIn,
    @Inject(GET_HARNESS_PORT_IN)
    private readonly getHarness: IGetHarnessPortIn,
    private readonly requestMapper: ProblemRequestMapper,
  ) {}

  @Get('managed/:id/test-cases')
  @ApiOperation({ summary: 'List all test cases of a problem' })
  @ApiOkResponse({ type: TestCaseListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  async list(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
  ): Promise<TestCaseListResponseDto> {
    const result = await this.listTestCases.execute(principal, problemId);

    return {
      items: [...result.items],
      testSuiteSummary: toTestSuiteSummaryDto(result.testSuiteSummary),
    };
  }

  @Get('managed/:id/test-cases/:testCaseId')
  @ApiOperation({ summary: 'Get a test case' })
  @ApiOkResponse({ type: TestCaseResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem or test case not found' })
  async get(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
  ): Promise<TestCaseResponseDto> {
    return this.getTestCase.execute(principal, problemId, testCaseId);
  }

  @Post(':id/test-cases')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a test case' })
  @ApiCreatedResponse({ type: TestCaseResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or test suite limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD, deleted, or no longer ready' })
  async add(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Body() dto: AddTestCaseRequestDto,
  ): Promise<TestCaseResponseDto> {
    return this.addTestCase.execute(
      principal,
      problemId,
      this.requestMapper.toAddTestCaseCommand(dto),
    );
  }

  @Put(':id/test-cases/order')
  @ApiOperation({ summary: 'Reorder all test cases of a problem' })
  @ApiOkResponse({ type: [TestCaseResponseDto] })
  @ApiBadRequestResponse({ description: 'The ID list is not a complete permutation' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD or deleted' })
  async reorder(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Body() dto: ReorderTestCasesRequestDto,
  ): Promise<readonly TestCaseResponseDto[]> {
    return this.reorderTestCases.execute(
      principal,
      problemId,
      this.requestMapper.toReorderTestCasesCommand(dto),
    );
  }

  @Patch(':id/test-cases/:testCaseId')
  @ApiOperation({ summary: 'Update a test case' })
  @ApiOkResponse({ type: TestCaseResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or test suite limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem or test case not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD, deleted, or no longer ready' })
  async update(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
    @Body() dto: UpdateTestCaseRequestDto,
  ): Promise<TestCaseResponseDto> {
    return this.updateTestCase.execute(
      principal,
      problemId,
      testCaseId,
      this.requestMapper.toUpdateTestCaseCommand(dto),
    );
  }

  @Delete(':id/test-cases/:testCaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a test case' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem or test case not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD, deleted, or no longer ready' })
  async remove(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
  ): Promise<void> {
    await this.removeTestCase.execute(principal, problemId, testCaseId);
  }

  @Get('managed/:id/harnesses/:language')
  @ApiOperation({ summary: 'Get the test harness for a language' })
  @ApiOkResponse({ type: HarnessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or language' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem or harness not found' })
  async getHarnessForLanguage(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Param() params: HarnessLanguageParamDto,
  ): Promise<HarnessResponseDto> {
    return this.getHarness.execute(principal, problemId, params.language);
  }

  @Put(':id/harnesses/:language')
  @ApiOperation({ summary: 'Set or replace the test harness for a language' })
  @ApiOkResponse({ type: HarnessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or language is not enabled' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD, deleted, or no longer ready' })
  async setHarnessForLanguage(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Param() params: HarnessLanguageParamDto,
    @Body() dto: SetHarnessRequestDto,
  ): Promise<HarnessResponseDto> {
    return this.setHarness.execute(
      principal,
      problemId,
      this.requestMapper.toSetHarnessCommand(params.language, dto),
    );
  }

  @Delete(':id/harnesses/:language')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove the test harness for a language' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Invalid UUID or language' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing permission or not the owner' })
  @ApiNotFoundResponse({ description: 'Problem or harness not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD, deleted, or no longer ready' })
  async removeHarnessForLanguage(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) problemId: string,
    @Param() params: HarnessLanguageParamDto,
  ): Promise<void> {
    await this.removeHarness.execute(principal, problemId, params.language);
  }
}
