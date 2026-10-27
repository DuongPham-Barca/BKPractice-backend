import { EXCEPTION_FILTERS_METADATA, GUARDS_METADATA } from '@nestjs/common/constants';

import { ProblemExceptionFilter } from './filters/problem-exception.filter';
import { TrustedPrincipalGuard } from './guards/trusted-principal.guard';
import { PublicProblemsController } from './public-problems.controller';

describe('PublicProblemsController authentication wiring', () => {
  it('guards every public route with TrustedPrincipalGuard', () => {
    const guards = metadataOf<unknown>(GUARDS_METADATA);

    expect(guards).toContain(TrustedPrincipalGuard);
  });

  it('maps authentication failures through ProblemExceptionFilter', () => {
    const filters = metadataOf<unknown>(EXCEPTION_FILTERS_METADATA);

    expect(filters).toContain(ProblemExceptionFilter);
  });
});

function metadataOf<T>(key: string): readonly T[] {
  return (Reflect.getMetadata(key, PublicProblemsController) ?? []) as readonly T[];
}
