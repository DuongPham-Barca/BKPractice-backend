import type { ProblemQueryDto } from './dto/problem-query.dto';
import type { ProblemResponseMapper } from './mappers/problem-response.mapper';
import { PublicProblemsController } from './public-problems.controller';

describe('PublicProblemsController', () => {
  it('lists published problems with the query pagination', async () => {
    const listPublicProblems = { execute: jest.fn().mockResolvedValue({ items: [] }) };
    const responseMapper = {
      toPublicPage: jest.fn().mockReturnValue({ items: [], total: 0, page: 2, limit: 5 }),
    };
    const controller = createController({ listPublicProblems, responseMapper });
    const query = { page: 2, limit: 5 } as ProblemQueryDto;

    await expect(controller.list(query)).resolves.toEqual({
      items: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    expect(listPublicProblems.execute).toHaveBeenCalledWith(query, 2, 5);
    expect(responseMapper.toPublicPage).toHaveBeenCalledWith({ items: [] });
  });

  it('returns the public detail for an id or slug', async () => {
    const getPublicProblem = { execute: jest.fn().mockResolvedValue({ id: 'problem-id' }) };
    const responseMapper = {
      toPublicDetail: jest.fn().mockReturnValue({ id: 'problem-id' }),
    };
    const controller = createController({ getPublicProblem, responseMapper });
    const params = { idOrSlug: 'two-sum' };

    await expect(controller.detail(params)).resolves.toEqual({ id: 'problem-id' });
    expect(getPublicProblem.execute).toHaveBeenCalledWith('two-sum');
    expect(responseMapper.toPublicDetail).toHaveBeenCalledWith({ id: 'problem-id' });
  });
});

function createController(dependencies: {
  getPublicProblem?: { execute: jest.Mock };
  listPublicProblems?: { execute: jest.Mock };
  responseMapper?: {
    toPublicPage?: jest.Mock;
    toPublicDetail?: jest.Mock;
  };
}): PublicProblemsController {
  const {
    getPublicProblem = { execute: jest.fn() },
    listPublicProblems = { execute: jest.fn() },
    responseMapper = { toPublicPage: jest.fn(), toPublicDetail: jest.fn() },
  } = dependencies;

  return new PublicProblemsController(
    getPublicProblem,
    listPublicProblems,
    responseMapper as unknown as ProblemResponseMapper,
  );
}
