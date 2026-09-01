import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { communityEntities } from '../modules/community.entities';

export default new DataSource({
  type: 'postgres',
  url: process.env.COMMUNITY_DATABASE_URL,
  entities: communityEntities,
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
