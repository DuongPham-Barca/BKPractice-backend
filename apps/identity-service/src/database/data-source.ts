import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { identityEntities } from '../modules/identity.entities';

export default new DataSource({
  type: 'postgres',
  url: process.env.IDENTITY_DATABASE_URL,
  entities: identityEntities,
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
