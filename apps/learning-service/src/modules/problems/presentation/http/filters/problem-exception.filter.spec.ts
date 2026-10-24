import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ApplicationError } from '../../../application/errors/application.error';
import { ConcurrentModificationError } from '../../../application/errors/concurrent-modification.error';
import { ForbiddenError } from '../../../application/errors/forbidden.error';
import { ProblemNotFoundError } from '../../../application/errors/problem-not-found.error';
import { PublishNotReadyError } from '../../../application/errors/publish-not-ready.error';
import { UnauthorizedError } from '../../../application/errors/unauthorized.error';
import { UnknownReferenceError } from '../../../application/errors/unknown-reference.error';
import { DomainValidationError } from '../../../domain/errors/domain-validation.error';
import { DuplicateSlugError } from '../../../domain/errors/duplicate-slug.error';
import { InvalidProblemState } from '../../../domain/errors/invalid-problem-state.error';

import { ProblemExceptionFilter } from './problem-exception.filter';

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(data: unknown): MockResponse;
}

function createMockHost(): { host: ArgumentsHost; response: MockResponse } {
  const response: MockResponse = {
    statusCode: 0,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('ProblemExceptionFilter', () => {
  let filter: ProblemExceptionFilter;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ProblemExceptionFilter],
    }).compile();

    filter = moduleRef.get(ProblemExceptionFilter);
  });

  it.each([
    [new DomainValidationError('field', 'message'), HttpStatus.BAD_REQUEST],
    [new UnknownReferenceError([{ kind: 'topic', id: '1' }]), HttpStatus.BAD_REQUEST],
    [new PublishNotReadyError([]), HttpStatus.BAD_REQUEST],
    [new UnauthorizedError(), HttpStatus.UNAUTHORIZED],
    [new ForbiddenError(), HttpStatus.FORBIDDEN],
    [new ProblemNotFoundError('id'), HttpStatus.NOT_FOUND],
    [new DuplicateSlugError('slug'), HttpStatus.CONFLICT],
    [new InvalidProblemState('field', 'message'), HttpStatus.CONFLICT],
    [new ConcurrentModificationError(), HttpStatus.CONFLICT],
  ])('maps %s to HTTP %d', (exception, expectedStatus) => {
    const { host, response } = createMockHost();
    filter.catch(exception, host);
    expect(response.statusCode).toBe(expectedStatus);
  });

  it('includes issues array for PublishNotReadyError', () => {
    const issues = [
      { code: 'MISSING_CONTRACT', field: 'functionContracts', message: 'missing' },
      { code: 'NO_LANGUAGE', message: 'no language' },
    ];
    const exception = new PublishNotReadyError(issues);
    const { host, response } = createMockHost();

    filter.catch(exception, host);

    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toHaveProperty('issues', issues);
  });

  it('unknown ApplicationError subclass maps to 500', () => {
    class UnknownError extends ApplicationError {
      readonly code = 'UNKNOWN';
      constructor() {
        super('unknown');
      }
    }

    const { host, response } = createMockHost();
    filter.catch(new UnknownError(), host);
    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
