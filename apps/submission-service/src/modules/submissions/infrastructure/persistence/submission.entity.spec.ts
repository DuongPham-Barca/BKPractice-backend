import { getMetadataArgsStorage } from 'typeorm';

import { SubmissionKind, SubmissionStatus } from '../../domain/submission-record';

import { Submission } from './submission.entity';

describe('Submission persistence mapping', () => {
  const columns = getMetadataArgsStorage().columns.filter((column) => column.target === Submission);
  const column = (propertyName: string) =>
    columns.find((candidate) => candidate.propertyName === propertyName);

  it('maps kind and status with the domain enums as the single source of truth', () => {
    expect(column('kind')?.options.enum).toBe(SubmissionKind);
    expect(column('status')?.options.enum).toBe(SubmissionStatus);
    expect(SubmissionStatus.Executed).toBe('EXECUTED');
  });

  it('maps publicId and nullable stdin without exposing them as primary keys', () => {
    expect(column('publicId')?.options).toMatchObject({
      name: 'public_id',
      type: 'uuid',
      unique: true,
    });
    expect(column('publicId')?.mode).toBe('regular');
    expect(column('stdin')?.options).toMatchObject({ type: 'text', nullable: true });
  });
});
