import 'reflect-metadata';

import { communityEntities } from '@community/modules/community.entities';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.COMMUNITY_DATABASE_URL,
  entities: communityEntities,
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
