import type { QueryRunner } from 'typeorm';

import { AddRunStdin1792515601000 } from './migrations/1792515601000-AddRunStdin';
import { AddExecutedSubmissionStatus1792515602000 } from './migrations/1792515602000-AddExecutedSubmissionStatus';
import { AddSubmissionPublicIdAndIndex1792515603000 } from './migrations/1792515603000-AddSubmissionPublicIdAndIndex';

function queryRunner(): jest.Mocked<QueryRunner> {
  return { query: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<QueryRunner>;
}

describe('Run Code migrations', () => {
  it('adds nullable stdin and has a reversible column-only down migration', async () => {
    const runner = queryRunner();
    const migration = new AddRunStdin1792515601000();

    await migration.up(runner);
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringMatching(/ADD COLUMN "stdin" text NULL/i),
    );

    await migration.down(runner);
    expect(runner.query).toHaveBeenCalledWith(expect.stringMatching(/DROP COLUMN "stdin"/i));
  });

  it('adds EXECUTED and makes down fail clearly when EXECUTED rows exist', async () => {
    const runner = queryRunner();
    const migration = new AddExecutedSubmissionStatus1792515602000();

    await migration.up(runner);
    expect(runner.query).toHaveBeenCalledWith(expect.stringMatching(/ADD VALUE.*EXECUTED/is));

    await migration.down(runner);
    expect(runner.query).toHaveBeenCalledWith(expect.stringMatching(/RAISE EXCEPTION.*EXECUTED/is));
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringMatching(/CREATE TYPE.*submissions_status_enum/is),
    );
  });

  it('backfills public IDs, keeps the UUID default, and creates the owner cursor index', async () => {
    const runner = queryRunner();
    const migration = new AddSubmissionPublicIdAndIndex1792515603000();

    await migration.up(runner);
    const sql = runner.query.mock.calls.flat().join('\n');
    expect(sql).toMatch(/public_id.*gen_random_uuid/is);
    expect(sql).toMatch(/UPDATE "submissions".*public_id.*IS NULL/is);
    expect(sql).toMatch(/NOT NULL/is);
    expect(sql).toMatch(/UNIQUE/is);
    expect(sql).toMatch(
      /IDX_submissions_owner_created.*user_id.*created_at.*DESC.*public_id.*DESC/is,
    );
  });

  it('drops only the cursor index on rollback and keeps issued public IDs', async () => {
    const runner = queryRunner();

    await new AddSubmissionPublicIdAndIndex1792515603000().down(runner);

    const sql = runner.query.mock.calls.flat().join('\n');
    expect(sql).toMatch(/DROP INDEX IF EXISTS "IDX_submissions_owner_created"/);
    expect(sql).not.toMatch(/public_id/i);
  });
});
