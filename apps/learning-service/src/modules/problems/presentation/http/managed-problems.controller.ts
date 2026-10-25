import { CreateProblemUseCase } from '@learning/modules/problems/application/use-cases/create-problem.use-case';
import { GetManagedProblemUseCase } from '@learning/modules/problems/application/use-cases/get-managed-problem.use-case';
import { HoldProblemUseCase } from '@learning/modules/problems/application/use-cases/hold-problem.use-case';
import { ListManagedProblemsUseCase } from '@learning/modules/problems/application/use-cases/list-managed-problems.use-case';
import { PreviewProblemUseCase } from '@learning/modules/problems/application/use-cases/preview-problem.use-case';
import { PublishProblemUseCase } from '@learning/modules/problems/application/use-cases/publish-problem.use-case';
import { RepublishProblemUseCase } from '@learning/modules/problems/application/use-cases/republish-problem.use-case';
import { RestoreProblemUseCase } from '@learning/modules/problems/application/use-cases/restore-problem.use-case';
import { SoftDeleteProblemUseCase } from '@learning/modules/problems/application/use-cases/soft-delete-problem.use-case';
import { UpdateProblemUseCase } from '@learning/modules/problems/application/use-cases/update-problem.use-case';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateProblemRequestDto } from './dto/create-problem.request.dto';
import { IncludeDeletedQueryDto, ManagedProblemQueryDto } from './dto/problem-query.dto';
import {
  ManagedProblemListResponseDto,
  ManagedProblemResponseDto,
  SoftDeleteProblemResponseDto,
} from './dto/problem-response.dto';
import { UpdateProblemRequestDto } from './dto/update-problem.request.dto';
import { ProblemExceptionFilter } from './filters/problem-exception.filter';
import { ProblemRequestMapper } from './mappers/problem-request.mapper';
import { ProblemResponseMapper } from './mappers/problem-response.mapper';

@ApiTags('problems')
@ApiBearerAuth()
@UseFilters(ProblemExceptionFilter)
@Controller('api/problems')
export class ManagedProblemsController {
  constructor(
    private readonly createProblem: CreateProblemUseCase,
    private readonly updateProblem: UpdateProblemUseCase,
    private readonly publishProblem: PublishProblemUseCase,
    private readonly holdProblem: HoldProblemUseCase,
    private readonly republishProblem: RepublishProblemUseCase,
    private readonly softDeleteProblem: SoftDeleteProblemUseCase,
    private readonly restoreProblem: RestoreProblemUseCase,
    private readonly getManagedProblem: GetManagedProblemUseCase,
    private readonly listManagedProblems: ListManagedProblemsUseCase,
    private readonly previewProblem: PreviewProblemUseCase,
    private readonly requestMapper: ProblemRequestMapper,
    private readonly responseMapper: ProblemResponseMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a draft problem',
    description:
      'Creates a new DRAFT problem. Requires LECTURER role and problem:create permission. The slug must be unique. Minimum required fields: slug, title, statement, problemType, difficulty. Other fields use sensible defaults.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Created draft problem' })
  @ApiBadRequestResponse({ description: 'Validation error, duplicate slug, or unknown reference' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing LECTURER role or problem:create permission' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async create(@Body() dto: CreateProblemRequestDto): Promise<ManagedProblemResponseDto> {
    const result = await this.createProblem.execute(this.requestMapper.toCreateCommand(dto));
    return this.responseMapper.toManagedDetail(result, false);
  }

  @Get('managed')
  @ApiOperation({
    summary: 'List problems owned by the current lecturer',
    description:
      'Returns paginated list of problems owned by the authenticated lecturer. Supports includeDeleted filter. Only problems where the lecturer is the creator are returned.',
  })
  @ApiOkResponse({
    type: ManagedProblemListResponseDto,
    description: 'Paginated list of managed problems',
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Missing LECTURER role or problem:read-managed permission' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async listManaged(
    @Query() query: ManagedProblemQueryDto,
  ): Promise<ManagedProblemListResponseDto> {
    const page = await this.listManagedProblems.execute(
      query.includeDeleted,
      query.page,
      query.limit,
    );
    return this.responseMapper.toManagedPage(page, query.includeDeleted);
  }

  @Get('managed/:id')
  @ApiOperation({
    summary: 'Get a managed problem',
    description:
      'Returns full problem details including readiness. Requires ownership. By default deleted problems are hidden; use includeDeleted=true to view them.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Managed problem details' })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:read-managed permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getManaged(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: IncludeDeletedQueryDto,
  ): Promise<ManagedProblemResponseDto> {
    const result = await this.getManagedProblem.execute(id, query.includeDeleted);
    return this.responseMapper.toManagedDetail(result, query.includeDeleted);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a problem owned by the current lecturer',
    description:
      'Updates a problem. Only the owner (creator) can update. DRAFT and PUBLISHED problems can be updated; ON_HOLD problems return 409. Semantics: field absent = keep current value, null = clear nullable field, empty array = clear collection. The slug field is not accepted.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Updated problem' })
  @ApiBadRequestResponse({ description: 'Validation error, unknown reference, or slug in body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:update permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is ON_HOLD or concurrent modification' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProblemRequestDto,
  ): Promise<ManagedProblemResponseDto> {
    const result = await this.updateProblem.execute(id, this.requestMapper.toUpdateCommand(dto));
    return this.responseMapper.toManagedDetail(result, false);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a draft problem',
    description:
      'Publishes a DRAFT problem. Validates readiness (enabled languages, contracts, starter codes, limits, etc.). Returns 400 with issues if not ready. Only the owner can publish.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Published problem' })
  @ApiBadRequestResponse({
    description: 'Problem not ready to publish (issues in response)',
    headers: { issues: { description: 'Array of readiness issues' } },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:publish permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is not DRAFT or concurrent modification' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedProblemResponseDto> {
    const result = await this.publishProblem.execute(id);
    return this.responseMapper.toManagedDetail(result, false);
  }

  @Post(':id/hold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Move a published problem on hold',
    description:
      'Moves a PUBLISHED problem to ON_HOLD. The problem becomes invisible in public listings. Only the owner can hold.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Problem on hold' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:hold permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is not PUBLISHED or concurrent modification' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async hold(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedProblemResponseDto> {
    const result = await this.holdProblem.execute(id);
    return this.responseMapper.toManagedDetail(result, false);
  }

  @Post(':id/republish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Republish a problem on hold',
    description: 'Republishes an ON_HOLD problem back to PUBLISHED. Only the owner can republish.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Republished problem' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:republish permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is not ON_HOLD or concurrent modification' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async republish(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedProblemResponseDto> {
    const result = await this.republishProblem.execute(id);
    return this.responseMapper.toManagedDetail(result, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a published or held problem',
    description:
      'Soft-deletes a PUBLISHED or ON_HOLD problem. The problem is hidden from public listings. Returns deletedAt timestamp. DRAFT problems cannot be deleted (409). Only the owner can delete.',
  })
  @ApiOkResponse({ type: SoftDeleteProblemResponseDto, description: 'Soft-deleted problem' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:delete permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is DRAFT or concurrent modification' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<SoftDeleteProblemResponseDto> {
    const result = await this.softDeleteProblem.execute(id);
    return this.responseMapper.toSoftDelete(result);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a soft-deleted problem',
    description:
      'Restores a soft-deleted problem to its previous status (PUBLISHED or ON_HOLD). Only the owner can restore.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Restored problem' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:restore permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiConflictResponse({ description: 'Problem is not deleted or concurrent modification' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async restore(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedProblemResponseDto> {
    const result = await this.restoreProblem.execute(id);
    return this.responseMapper.toManagedDetail(result, false);
  }

  @Post(':id/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview a problem including a deleted one',
    description:
      'Returns full managed problem details for preview. Works for DRAFT, PUBLISHED, ON_HOLD, and deleted problems. Does not change status or execute anything. Includes deletedAt if the problem is deleted.',
  })
  @ApiOkResponse({ type: ManagedProblemResponseDto, description: 'Preview problem details' })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({
    description: 'Missing LECTURER role, problem:read-managed permission, or not the owner',
  })
  @ApiNotFoundResponse({ description: 'Problem not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async preview(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedProblemResponseDto> {
    const result = await this.previewProblem.execute(id);
    return this.responseMapper.toManagedDetail(result, true);
  }
}
