import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { SubmissionAcceptedOutbox } from '../modules/submissions/infrastructure/persistence/submission-accepted-outbox.entity';
import {
  Submission,
  SubmissionResult,
} from '../modules/submissions/infrastructure/persistence/submission.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.SUBMISSION_DATABASE_URL,
  entities: [Submission, SubmissionResult, SubmissionAcceptedOutbox],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
