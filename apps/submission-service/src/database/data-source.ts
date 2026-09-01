import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { Submission, SubmissionResult } from '../modules/submissions/entities/submission.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.SUBMISSION_DATABASE_URL,
  entities: [Submission, SubmissionResult],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
