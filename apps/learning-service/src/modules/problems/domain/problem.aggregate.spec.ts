import { DomainValidationError } from './errors/domain-validation.error';
import { InvalidProblemState } from './errors/invalid-problem-state.error';
import {
  TEST_USER_ID,
  buildProblem,
  functionContract,
  languages,
  oopContract,
  starterCode,
} from './testing/problem-test.factory';
import {
  Constraints,
  EnabledLanguage,
  ProblemTitle,
  TagReference,
  TestSuiteSummary,
  TopicReference,
} from './value-objects';

const TOPIC_ID = '00000000-0000-4000-8000-000000000010';
const TAG_ID = '00000000-0000-4000-8000-000000000020';

describe('Problem.create', () => {
  it('creates a draft with timestamps and a copied internal state', () => {
    const enabledLanguages = [...languages('python')];
    const problem = buildProblem({
      enabledLanguages,
      starterCodes: [starterCode('python')],
      topics: [new TopicReference(TOPIC_ID)],
      tags: [new TagReference(TAG_ID)],
    });

    expect(problem.isDraft).toBe(true);
    expect(problem.isDeleted).toBe(false);
    expect(problem.publishStatus).toBe('DRAFT');
    expect(problem.createdAt).toEqual(problem.updatedAt);
    expect(problem.createdBy.value).toBe(TEST_USER_ID);

    enabledLanguages.push(new EnabledLanguage('java'));

    expect(problem.enabledLanguages).toHaveLength(1);
    expect(problem.topics[0]?.value).toBe(TOPIC_ID);
  });

  it('rejects duplicate topics and tags', () => {
    expect(() =>
      buildProblem({
        topics: [new TopicReference(TOPIC_ID), new TopicReference(TOPIC_ID)],
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      buildProblem({
        tags: [new TagReference(TAG_ID), new TagReference(TAG_ID)],
      }),
    ).toThrow(DomainValidationError);
  });

  it('rejects duplicate enabled languages and duplicate starter languages', () => {
    expect(() => buildProblem({ enabledLanguages: languages('python', 'python') })).toThrow(
      DomainValidationError,
    );

    expect(() =>
      buildProblem({
        enabledLanguages: languages('python'),
        starterCodes: [starterCode('python'), starterCode('python', 'other')],
      }),
    ).toThrow(DomainValidationError);
  });

  it('rejects starter code for a language that is not enabled', () => {
    expect(() =>
      buildProblem({
        enabledLanguages: languages('python'),
        starterCodes: [starterCode('java')],
      }),
    ).toThrow(DomainValidationError);
  });

  it('rejects contracts for a language that is not enabled', () => {
    expect(() =>
      buildProblem({
        problemType: 'FUNCTION',
        enabledLanguages: languages('python'),
        functionContracts: new Map([['java', functionContract()]]),
      }),
    ).toThrow(DomainValidationError);
  });

  it('rejects contracts that do not belong to the problem type', () => {
    expect(() =>
      buildProblem({
        problemType: 'STANDARD',
        enabledLanguages: languages('python'),
        functionContracts: new Map([['python', functionContract()]]),
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      buildProblem({
        problemType: 'FUNCTION',
        enabledLanguages: languages('python'),
        oopContracts: new Map([['python', oopContract()]]),
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      buildProblem({
        problemType: 'OOP',
        enabledLanguages: languages('python'),
        functionContracts: new Map([['python', functionContract()]]),
      }),
    ).toThrow(DomainValidationError);
  });

  it('accepts valid FUNCTION and OOP configurations', () => {
    expect(
      buildProblem({
        problemType: 'FUNCTION',
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
        starterCodes: [starterCode('python')],
        functionContracts: new Map([['python', functionContract()]]),
      }).problemType,
    ).toBe('FUNCTION');

    expect(
      buildProblem({
        problemType: 'OOP',
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
        starterCodes: [starterCode('python')],
        oopContracts: new Map([['python', oopContract()]]),
      }).problemType,
    ).toBe('OOP');
  });
});

describe('Problem.update', () => {
  it('updates an editable draft and refreshes updatedAt', () => {
    const problem = buildProblem();
    const now = new Date('2026-01-02T00:00:00.000Z');

    problem.update({ title: new ProblemTitle('Updated') }, now);

    expect(problem.title.value).toBe('Updated');
    expect(problem.updatedAt).toEqual(now);
    expect(problem.createdAt).not.toEqual(now);
  });

  it('allows an update while published', () => {
    const problem = buildProblem();
    problem.publish();

    problem.update({ title: new ProblemTitle('Published update') });

    expect(problem.isPublished).toBe(true);
    expect(problem.title.value).toBe('Published update');
  });

  it('clears a nullable field with null', () => {
    const problem = buildProblem({ constraints: new Constraints('n <= 100') });

    problem.update({ constraints: null });

    expect(problem.constraints).toBeNull();
  });

  it('rejects an update while on hold', () => {
    const problem = buildProblem();
    problem.publish();
    problem.hold();

    expect(() => problem.update({ title: new ProblemTitle('Nope') })).toThrow(InvalidProblemState);
  });

  it('rejects an update after deletion', () => {
    const problem = buildProblem();
    problem.publish();
    problem.softDelete();

    expect(() => problem.update({ title: new ProblemTitle('Nope') })).toThrow(InvalidProblemState);
  });

  it('rejects changing the problem type outside DRAFT without mutating state', () => {
    const problem = buildProblem();
    problem.publish();

    expect(() => problem.update({ problemType: 'FUNCTION' })).toThrow(InvalidProblemState);
    expect(problem.problemType).toBe('STANDARD');
  });

  it('allows changing the problem type while DRAFT', () => {
    const problem = buildProblem();

    problem.update({ problemType: 'FUNCTION' });

    expect(problem.problemType).toBe('FUNCTION');
  });

  it('does not mutate state when the new timestamp is invalid', () => {
    const problem = buildProblem();

    expect(() => problem.update({ title: new ProblemTitle('Nope') }, new Date(Number.NaN))).toThrow(
      DomainValidationError,
    );
    expect(problem.title.value).toBe('Two Sum');
  });
});

describe('Problem lifecycle', () => {
  it('publishes a draft, holds it, and republishes it', () => {
    const problem = buildProblem();

    problem.publish();
    expect(problem.publishStatus).toBe('PUBLISHED');

    problem.hold();
    expect(problem.publishStatus).toBe('ON_HOLD');

    problem.republish();
    expect(problem.publishStatus).toBe('PUBLISHED');
  });

  it('rejects invalid transitions without mutating state', () => {
    const problem = buildProblem();

    expect(() => problem.hold()).toThrow(InvalidProblemState);
    expect(() => problem.republish()).toThrow(InvalidProblemState);
    expect(() => problem.softDelete()).toThrow(InvalidProblemState);
    expect(() => problem.restore()).toThrow(InvalidProblemState);
    expect(problem.publishStatus).toBe('DRAFT');

    problem.publish();

    expect(() => problem.publish()).toThrow(InvalidProblemState);
    expect(problem.publishStatus).toBe('PUBLISHED');
  });

  it('soft deletes PUBLISHED and ON_HOLD problems while preserving status', () => {
    const published = buildProblem();
    published.publish();
    published.softDelete(new Date('2026-01-03T00:00:00.000Z'));

    expect(published.isDeleted).toBe(true);
    expect(published.publishStatus).toBe('PUBLISHED');
    expect(published.deletedAt?.toISOString()).toBe('2026-01-03T00:00:00.000Z');

    const onHold = buildProblem();
    onHold.publish();
    onHold.hold();
    onHold.softDelete();

    expect(onHold.isDeleted).toBe(true);
    expect(onHold.publishStatus).toBe('ON_HOLD');
  });

  it('restores a deleted problem while preserving status', () => {
    const problem = buildProblem();
    problem.publish();
    problem.softDelete();

    problem.restore();

    expect(problem.isDeleted).toBe(false);
    expect(problem.deletedAt).toBeNull();
    expect(problem.publishStatus).toBe('PUBLISHED');
  });

  it('rejects publishing, holding, and deleting a deleted problem', () => {
    const problem = buildProblem();
    problem.publish();
    problem.softDelete();

    expect(() => problem.publish()).toThrow(InvalidProblemState);
    expect(() => problem.hold()).toThrow(InvalidProblemState);
    expect(() => problem.republish()).toThrow(InvalidProblemState);
    expect(() => problem.softDelete()).toThrow(InvalidProblemState);
  });

  it('does not delete when the timestamp is invalid', () => {
    const problem = buildProblem();
    problem.publish();

    expect(() => problem.softDelete(new Date(Number.NaN))).toThrow(DomainValidationError);
    expect(problem.isDeleted).toBe(false);
  });
});

describe('Problem test suite and harness rules', () => {
  it('allows test case and harness changes only for DRAFT or PUBLISHED', () => {
    const draft = buildProblem({
      problemType: 'FUNCTION',
      enabledLanguages: languages('python'),
    });

    expect(() => draft.assertCanManageTestCases()).not.toThrow();
    expect(() => draft.assertCanManageHarnesses()).not.toThrow();

    draft.publish();

    expect(() => draft.assertCanManageTestCases()).not.toThrow();
    expect(() => draft.assertCanManageHarnesses()).not.toThrow();

    draft.hold();

    expect(() => draft.assertCanManageTestCases()).toThrow(InvalidProblemState);
    expect(() => draft.assertCanManageHarnesses()).toThrow(InvalidProblemState);

    const deleted = buildProblem({
      problemType: 'FUNCTION',
      enabledLanguages: languages('python'),
    });
    deleted.publish();
    deleted.softDelete();

    expect(() => deleted.assertCanManageTestCases()).toThrow(InvalidProblemState);
    expect(() => deleted.assertCanManageHarnesses()).toThrow(InvalidProblemState);
  });

  it('rejects harnesses for STANDARD problems and disabled languages', () => {
    const standard = buildProblem({ enabledLanguages: languages('python') });

    expect(() => standard.assertCanManageHarnesses()).toThrow(DomainValidationError);

    const functional = buildProblem({
      problemType: 'FUNCTION',
      enabledLanguages: languages('python'),
    });

    expect(() => functional.assertHarnessLanguageIsEnabled('python')).not.toThrow();
    expect(() => functional.assertHarnessLanguageIsEnabled('java')).toThrow(DomainValidationError);
  });

  it('attaches a derived summary without changing updatedAt', () => {
    const problem = buildProblem();
    const updatedAt = problem.updatedAt;

    problem.attachTestSuiteSummary(
      new TestSuiteSummary({
        totalCount: 3,
        hiddenCount: 1,
        totalScore: 10,
        totalBytes: 100,
        harnessLanguages: ['python'],
      }),
    );

    expect(problem.testSuiteSummary).toMatchObject({ totalCount: 3, hiddenCount: 1 });
    expect(problem.updatedAt).toEqual(updatedAt);
  });
});
