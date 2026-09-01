import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { EntitySchema, ObjectType } from 'typeorm';

type Entity = EntitySchema | ObjectType<unknown>;

export function databaseOptions(url: string, entities: Entity[]): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url,
    entities,
    synchronize: false,
    migrationsRun: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}
