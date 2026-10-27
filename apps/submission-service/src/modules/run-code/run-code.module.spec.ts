import { MODULE_METADATA } from '@nestjs/common/constants';

import { JUDGE_JOB_PORT } from '../submissions/domain/ports/judge-job.port';
import { LEARNING_JUDGE_PACKAGE_PORT } from '../submissions/domain/ports/learning-judge-package.port';
import { SUBMISSION_REPOSITORY_PORT } from '../submissions/domain/ports/submission-repository.port';
import { SubmissionsModule } from '../submissions/submissions.module';

import { RunCodeModule } from './run-code.module';

describe('RunCodeModule boundary', () => {
  it('reaches the Submission aggregate only through the repository and judge-job ports', () => {
    const exported = Reflect.getMetadata(MODULE_METADATA.EXPORTS, SubmissionsModule) as unknown[];
    const imported = Reflect.getMetadata(MODULE_METADATA.IMPORTS, RunCodeModule) as unknown[];

    expect(imported).toEqual([SubmissionsModule]);
    expect(exported).toEqual([SUBMISSION_REPOSITORY_PORT, JUDGE_JOB_PORT]);
    // SUB-001-FR-004: Run must never be able to inject hidden judge data from Learning.
    expect(exported).not.toContain(LEARNING_JUDGE_PACKAGE_PORT);
  });
});
