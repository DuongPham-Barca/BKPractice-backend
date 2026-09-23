import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { learningEntities } from '../modules/learning.entities';

export default new DataSource({
  type: 'postgres',
  url: process.env.LEARNING_DATABASE_URL,
  entities: learningEntities,
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
heheh