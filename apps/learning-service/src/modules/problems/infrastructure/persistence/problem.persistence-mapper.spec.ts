import type { SupportedLanguage } from '@app/contracts';
import type { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import {
  buildProblem,
  functionContract,
  oopContract,
  starterCode,
  TEST_USER_ID,
} from '@learning/modules/problems/domain/testing/problem-test.factory';
import { EnabledLanguage, OopContract } from '@learning/modules/problems/domain/value-objects';
import {
  Difficulty as EntityDifficulty,
  Problem as ProblemEntity,
  ProblemLanguage as ProblemLanguageEntity,
  PublishStatus as EntityPublishStatus,
  StarterCode as StarterCodeEntity,
} from '@learning/modules/problems/entities/problem.entity';
import type { ProblemTypeConfigJson } from '@learning/modules/problems/entities/problem.entity';

import { ProblemPersistenceMapper } from './problem.persistence-mapper';

describe('ProblemPersistenceMapper', () => {
  const mapper = new ProblemPersistenceMapper();

  it('round-trips all fields through insert values and rehydrate', () => {
    const problem = buildProblem({
      problemType: 'STANDARD',
      examples: [],
      tags: [],
      topics: [],
      enabledLanguages: [],
      starterCodes: [],
    });

    const entity = toEntity(problem, mapper);
    const restored = mapper.toDomain(entity);

    expect(restored.id.value).toBe(problem.id.value);
    expect(restored.slug.value).toBe(problem.slug.value);
    expect(restored.title.value).toBe(problem.title.value);
    expect(restored.statement.value).toBe(problem.statement.value);
    expect(restored.inputSpecification?.value).toBe(problem.inputSpecification?.value);
    expect(restored.outputSpecification?.value).toBe(problem.outputSpecification?.value);
    expect(restored.problemType).toBe(problem.problemType);
    expect(restored.difficulty).toBe(problem.difficulty);
    expect(restored.executionLimits).toEqual(problem.executionLimits);
    expect(restored.publishStatus).toBe(problem.publishStatus);
    expect(restored.createdBy.value).toBe(TEST_USER_ID);
    expect(restored.createdAt).toEqual(problem.createdAt);
    expect(restored.updatedAt).toEqual(problem.updatedAt);
    expect(restored.deletedAt).toBeNull();
  });

  it('maps description and statement in both directions', () => {
    const problem = buildProblem();
    const entity = toEntity(problem, mapper);

    expect(entity.description).toBe(problem.statement.value);

    entity.description = 'Changed statement';
    const restored = mapper.toDomain(entity);

    expect(restored.statement.value).toBe('Changed statement');
  });

  it('maps deleted_at to the deleted marker', () => {
    const deletedAt = new Date('2026-02-01T00:00:00.000Z');
    const problem = buildProblem();
    const entity = toEntity(problem, mapper);

    entity.deletedAt = deletedAt;
    expect(mapper.toDomain(entity).deletedAt).toEqual(deletedAt);

    entity.deletedAt = null;
    expect(mapper.toDomain(entity).deletedAt).toBeNull();
  });

  it('maps null type_config to empty contract maps', () => {
    const problem = buildProblem();
    const entity = toEntity(problem, mapper);

    entity.typeConfig = null;
    const restored = mapper.toDomain(entity);

    expect(restored.functionContracts.size).toBe(0);
    expect(restored.oopContracts.size).toBe(0);
  });

  it('round-trips FUNCTION contracts', () => {
    const contract = functionContract('solve');
    const problem = buildProblem({
      problemType: 'FUNCTION',
      enabledLanguages: [new EnabledLanguage('python')],
      functionContracts: new Map<SupportedLanguage, typeof contract>([['python', contract]]),
    });
    const entity = toEntity(problem, mapper);
    const restored = mapper.toDomain(entity);

    expect(restored.functionContracts.get('python')?.functionName).toBe('solve');
    expect(restored.functionContracts.get('python')?.parameters).toEqual(contract.parameters);
    expect(restored.functionContracts.get('python')?.returnType).toBe('number[]');
    expect(restored.oopContracts.size).toBe(0);
  });

  it('round-trips OOP contracts using constructor in JSONB and constructorContract in domain', () => {
    const contract = oopContract('Solution');
    const problem = buildProblem({
      problemType: 'OOP',
      enabledLanguages: [new EnabledLanguage('python')],
      oopContracts: new Map<SupportedLanguage, typeof contract>([['python', contract]]),
    });
    const entity = toEntity(problem, mapper);
    const config = entity.typeConfig as ProblemTypeConfigJson;
    const oop = config.ooContract?.['python'] as Record<string, unknown>;

    expect(oop['constructor']).toBeNull();
    expect(oop['constructorContract']).toBeUndefined();
    expect(oop['methods']).toEqual([
      {
        name: 'solve',
        access: 'PUBLIC',
        parameters: [{ name: 'values', type: 'number[]' }],
        returnType: 'number[]',
      },
    ]);

    const restored = mapper.toDomain(entity);
    const loaded = restored.oopContracts.get('python');

    expect(loaded?.name).toBe('Solution');
    expect(loaded?.structure).toBe('CLASS');
    expect(loaded?.constructorContract).toBeNull();
    expect(loaded?.methods).toEqual(contract.methods);
  });

  it('preserves access, method, parameter, and name details', () => {
    const problem = buildProblem({
      problemType: 'OOP',
      enabledLanguages: [new EnabledLanguage('python')],
      oopContracts: new Map<SupportedLanguage, OopContract>([
        [
          'python',
          new OopContract({
            structure: 'CLASS',
            name: 'Detailed',
            constructorContract: {
              access: 'PROTECTED',
              parameters: [{ name: 'size', type: 'number' }],
            },
            methods: [
              {
                name: 'run',
                access: 'PRIVATE',
                parameters: [{ name: 'value', type: 'string' }],
                returnType: 'void',
              },
            ],
          }),
        ],
      ]),
    });
    const restored = mapper.toDomain(toEntity(problem, mapper));
    const loaded = restored.oopContracts.get('python');

    expect(loaded?.name).toBe('Detailed');
    expect(loaded?.constructorContract?.access).toBe('PROTECTED');
    expect(loaded?.constructorContract?.parameters).toEqual([{ name: 'size', type: 'number' }]);
    expect(loaded?.methods[0]?.access).toBe('PRIVATE');
    expect(loaded?.methods[0]?.parameters).toEqual([{ name: 'value', type: 'string' }]);
  });

  it('excludes disabled languages from the domain', () => {
    const problem = buildProblem({
      enabledLanguages: [new EnabledLanguage('python')],
      starterCodes: [starterCode('python', 'print(1)')],
    });
    const entity = toEntity(problem, mapper);
    const disabled = Object.assign(new ProblemLanguageEntity(), {
      language: 'java',
      enabled: false,
    });
    entity.languages.push(disabled);
    const restored = mapper.toDomain(entity);

    expect(restored.enabledLanguages.map((language) => language.value)).toEqual(['python']);
    expect(restored.starterCodes).toHaveLength(1);
    expect(restored.starterCodes[0]?.sourceCode).toBe('print(1)');
  });

  it('rejects malformed JSONB and unsupported language keys', () => {
    const problem = buildProblem();
    const malformed = toEntity(problem, mapper);
    malformed.typeConfig = {
      languageContract: {
        python: 'not-an-object',
      },
    };

    expect(() => mapper.toDomain(malformed)).toThrow();

    const unsupported = toEntity(problem, mapper);
    unsupported.typeConfig = {
      languageContract: {
        cobol: {
          functionName: 'solve',
          parameters: [],
          returnType: 'void',
        },
      },
    };

    expect(() => mapper.toDomain(unsupported)).toThrow();
  });

  it('does not include identity or timestamps in update values', () => {
    const problem = buildProblem();
    const values = mapper.toUpdateValues(problem);

    expect(values).not.toHaveProperty('id');
    expect(values).not.toHaveProperty('createdAt');
    expect(values).not.toHaveProperty('createdBy');
    expect(values).not.toHaveProperty('slug');
  });

  it('maps difficulty and publish status enums explicitly', () => {
    const problem = buildProblem();
    const entity = toEntity(problem, mapper);

    expect(entity.difficulty).toBe(EntityDifficulty.Easy);
    expect(entity.publishStatus).toBe(EntityPublishStatus.Draft);
  });
});

function toEntity(problem: Problem, mapper: ProblemPersistenceMapper): ProblemEntity {
  const entity = Object.assign(new ProblemEntity(), mapper.toInsertValues(problem));

  entity.topics = [];
  entity.tags = [];
  entity.languages = otherLanguages(problem);
  entity.starterCodes = problem.starterCodes.map((starter) =>
    Object.assign(new StarterCodeEntity(), {
      language: starter.language,
      sourceCode: starter.sourceCode,
    }),
  );

  return entity;
}

function otherLanguages(problem: Problem): ProblemLanguageEntity[] {
  return problem.enabledLanguages.map((language) =>
    Object.assign(new ProblemLanguageEntity(), {
      language: language.value,
      enabled: true,
    }),
  );
}
