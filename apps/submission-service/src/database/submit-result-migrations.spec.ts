import type { QueryRunner } from 'typeorm';

import { MakeSubmissionScoreNullable1792515604000 } from './migrations/1792515604000-MakeSubmissionScoreNullable';
import { CreateSubmissionAcceptedOutbox1792515605000 } from './migrations/1792515605000-CreateSubmissionAcceptedOutbox';

function queryRunner(): jest.Mocked<QueryRunner> {
  return { query: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<QueryRunner>;
}

function sqlOf(runner: jest.Mocked<QueryRunner>): string {
  return runner.query.mock.calls.flat().join('\n');
}

describe('Submit result migrations', () => {
  it('makes score nullable without a default', async () => {
    const runner = queryRunner();

    await new MakeSubmissionScoreNullable1792515604000().up(runner);

    expect(sqlOf(runner)).toMatch(/"score" DROP NOT NULL.*"score" DROP DEFAULT/is);
  });

  it('normalizes NULL scores to 0 before restoring NOT NULL', async () => {
    const runner = queryRunner();

    await new MakeSubmissionScoreNullable1792515604000().down(runner);

    const [normalize, restore] = runner.query.mock.calls.map(([sql]) => String(sql));
    expect(normalize).toMatch(/SET "score" = 0 WHERE "score" IS NULL/);
    expect(restore).toMatch(/SET DEFAULT 0.*SET NOT NULL/is);
  });

  it('creates the outbox with unique event and submission IDs and backfills unpublished accepted events', async () => {
    const runner = queryRunner();

    await new CreateSubmissionAcceptedOutbox1792515605000().up(runner);

    const sql = sqlOf(runner);
    expect(sql).toMatch(/PRIMARY KEY \("event_id"\)/);
    expect(sql).toMatch(/UNIQUE \("submission_id"\)/);
    expect(sql).toMatch(/IDX_submission_accepted_outbox_pending.*WHERE "published_at" IS NULL/is);
    expect(sql).toMatch(/INSERT INTO "submission_accepted_outbox"/);
    expect(sql).toMatch(/'score', 100/);
    expect(sql).toMatch(/"progress_event_published_at" IS NULL/);
    expect(sql).not.toMatch(/source_code/);
  });

  it('refuses to drop the outbox while undelivered events exist', async () => {
    const runner = queryRunner();

    await new CreateSubmissionAcceptedOutbox1792515605000().down(runner);

    const [guard, drop] = runner.query.mock.calls.map(([sql]) => String(sql));
    expect(guard).toMatch(/RAISE EXCEPTION.*undelivered/is);
    expect(drop).toMatch(/DROP TABLE "submission_accepted_outbox"/);
  });
});
