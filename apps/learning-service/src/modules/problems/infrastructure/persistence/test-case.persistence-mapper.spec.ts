import { TestCasePersistenceMapper } from './test-case.persistence-mapper';

describe('TestCasePersistenceMapper', () => {
  const mapper = new TestCasePersistenceMapper();

  it('maps is_hidden to visibility and keeps domain values', () => {
    const hidden = mapper.toDomain({
      id: '00000000-0000-4000-8000-000000000011',
      problemId: '00000000-0000-4000-8000-000000000001',
      input: '1 2',
      expectedOutput: '3',
      isHidden: true,
      score: 5,
      displayOrder: 2,
    });
    const sample = mapper.toDomain({
      id: '00000000-0000-4000-8000-000000000012',
      problemId: '00000000-0000-4000-8000-000000000001',
      input: '2 3',
      expectedOutput: '5',
      isHidden: false,
      score: 0,
      displayOrder: 3,
    });

    expect(hidden.visibility.value).toBe('HIDDEN');
    expect(hidden.displayOrder.value).toBe(2);
    expect(sample.visibility.value).toBe('SAMPLE');
    expect(sample.toSnapshot()).toEqual({
      id: '00000000-0000-4000-8000-000000000012',
      problemId: '00000000-0000-4000-8000-000000000001',
      input: '2 3',
      expectedOutput: '5',
      visibility: 'SAMPLE',
      score: 0,
      displayOrder: 3,
    });
  });
});
