import 'reflect-metadata';

import { SubmissionAcceptedOutbox } from '@submission/modules/submissions/infrastructure/persistence/submission-accepted-outbox.entity';
import {
  Submission,
  SubmissionResult,
} from '@submission/modules/submissions/infrastructure/persistence/submission.entity';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.SUBMISSION_DATABASE_URL,
  entities: [Submission, SubmissionResult, SubmissionAcceptedOutbox],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
