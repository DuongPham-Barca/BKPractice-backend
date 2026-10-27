import { plainToInstance } from 'class-transformer';

import {
  IncludeDeletedQueryDto,
  ManagedProblemQueryDto,
  ProblemIdentifierParamDto,
  ProblemQueryDto,
} from './problem-query.dto';

describe('problem query DTOs', () => {
  it('applies pagination defaults for a public query', () => {
    const query = plainToInstance(ProblemQueryDto, {});

    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
    expect(query.problemType).toBeUndefined();
    expect(query.difficulty).toBeUndefined();
    expect(query.topicId).toBeUndefined();
    expect(query.tagId).toBeUndefined();
    expect(query.search).toBeUndefined();
  });

  it('coerces numeric pagination values', () => {
    const query = plainToInstance(ProblemQueryDto, { page: '3', limit: '50' });

    expect(query.page).toBe(3);
    expect(query.limit).toBe(50);
  });

  it('coerces the includeDeleted flag on managed queries', () => {
    expect(plainToInstance(ManagedProblemQueryDto, { includeDeleted: 'true' }).includeDeleted).toBe(
      true,
    );
    expect(
      plainToInstance(ManagedProblemQueryDto, { includeDeleted: 'false' }).includeDeleted,
    ).toBe(false);
    expect(plainToInstance(ManagedProblemQueryDto, {}).includeDeleted).toBe(false);
    expect(plainToInstance(ManagedProblemQueryDto, {}).page).toBe(1);
    expect(plainToInstance(ManagedProblemQueryDto, {}).limit).toBe(20);
  });

  it('coerces the includeDeleted flag on include-deleted queries', () => {
    expect(plainToInstance(IncludeDeletedQueryDto, { includeDeleted: 'true' }).includeDeleted).toBe(
      true,
    );
    expect(plainToInstance(IncludeDeletedQueryDto, {}).includeDeleted).toBe(false);
  });

  it('keeps the identifier parameter as a string', () => {
    const params = plainToInstance(ProblemIdentifierParamDto, { idOrSlug: 'two-sum' });

    expect(params.idOrSlug).toBe('two-sum');
  });
});
