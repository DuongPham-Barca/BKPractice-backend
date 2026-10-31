import type {
  ProblemReferenceInfo,
  ProblemReferenceReader,
} from '@learning/modules/problems/application/ports/out/problem-reference-reader.port.out';
import { Problem } from '@learning/modules/problems/entities/problem.entity';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ProblemReferenceReaderAdapter implements ProblemReferenceReader {
  constructor(private readonly dataSource: DataSource) {}

  async getProblemReferences(
    problemIds: readonly string[],
  ): Promise<readonly ProblemReferenceInfo[]> {
    if (problemIds.length === 0) return [];
    const rows = await this.dataSource
      .getRepository(Problem)
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.slug',
        'p.title',
        'p.problemType',
        'p.difficulty',
        'p.publishStatus',
        'p.createdBy',
        'p.deletedAt',
      ])
      .where('p.id IN (:...ids)', { ids: [...problemIds] })
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      problemType: row.problemType,
      difficulty: row.difficulty,
      publishStatus: row.publishStatus,
      isDeleted: row.deletedAt !== null,
      createdBy: row.createdBy,
    }));
  }
}
