import { PublishNotReadyError } from '@learning/modules/problems/application/errors/publish-not-ready.error';
import type { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TestSuiteReadinessService {
  constructor(private readonly publishValidator: PublishValidator) {}

  assertReadyWhenPublished(problem: Problem): void {
    if (!problem.isPublished) {
      return;
    }

    const readiness = this.publishValidator.validate(problem, { slugAvailable: true });

    if (!readiness.ready) {
      throw new PublishNotReadyError(readiness.issues);
    }
  }
}
