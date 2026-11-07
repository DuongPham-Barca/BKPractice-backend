import { Injectable } from '@nestjs/common';

import type { PublishedProblemFilter } from '@/modules/progress/application/ports/out';
import { ProgressTransactionContext } from '@/modules/progress/infrastructure/persistence';
@Injectable()
export class PublishedProblemTypeOrmFilter implements PublishedProblemFilter {
  constructor(private readonly context: ProgressTransactionContext) {}
  async findPublishedIds(problemIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (!problemIds.length) return new Set();
    const rows = await this.context
      .getManager()
      .query<Array<{ id: string }>>(
        `SELECT id FROM problems WHERE id = ANY($1::uuid[]) AND publish_status = 'PUBLISHED' AND deleted_at IS NULL`,
        [[...problemIds]],
      );
    return new Set(rows.map((row) => row.id));
  }
}
