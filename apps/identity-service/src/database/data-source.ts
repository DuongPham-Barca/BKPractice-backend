import 'reflect-metadata';

import { identityEntities } from '@identity/modules/identity.entities';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.IDENTITY_DATABASE_URL,
  entities: identityEntities,
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
