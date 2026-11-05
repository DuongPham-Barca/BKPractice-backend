import 'reflect-metadata';

import { learningEntities } from '@learning/modules/learning.entities';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.LEARNING_DATABASE_URL,
  entities: learningEntities,
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
