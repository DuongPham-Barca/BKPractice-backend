import {
  CourseNotReadyError,
  ProblemNotAttachableError,
} from '@/modules/courses/application/errors';
import {
  AddChapterUseCase,
  RemoveChapterUseCase,
  ReorderChaptersUseCase,
  UpdateChapterUseCase,
  AttachProblemUseCase,
  DetachProblemUseCase,
  ReorderChapterProblemsUseCase,
} from '@/modules/courses/application/use-cases';
import { UpdateCourseUseCase } from '@/modules/courses/application/use-cases/update-course.use-case';
import {
  ChapterNotFound,
  DomainValidationError,
  InvalidCourseState,
  ProblemAlreadyInCourse,
} from '@/modules/courses/domain/errors';
import {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
  CourseDescription,
  CourseTitle,
  ProblemReference,
} from '@/modules/courses/domain/value-objects';
import {
  courseWithProblem,
  createCourseTestKit,
  draftCourse,
  admin,
  OTHER_ID,
  PROBLEM_ID,
} from '@/modules/courses/testing';

const OTHER_PROBLEM = '00000000-0000-4000-8000-0000000000d4';

const THIRD_PROBLEM = '00000000-0000-4000-8000-0000000000e5';

describe('Chapter and problem use cases', () => {
  let kit: ReturnType<typeof createCourseTestKit>;

  beforeEach(() => {
    kit = createCourseTestKit();
    kit.catalog.setProblem(PROBLEM_ID);
  });

  const addChapter = () =>
    new AddChapterUseCase(kit.authorization, kit.repository, kit.transactions, kit.views);
  const updateChapter = () =>
    new UpdateChapterUseCase(kit.authorization, kit.repository, kit.transactions, kit.views);
  const removeChapter = () =>
    new RemoveChapterUseCase(kit.authorization, kit.repository, kit.transactions, kit.readiness);
  const reorderChapters = () =>
    new ReorderChaptersUseCase(kit.authorization, kit.repository, kit.transactions, kit.views);
  const attach = () =>
    new AttachProblemUseCase(
      kit.authorization,
      kit.repository,
      kit.transactions,
      kit.views,
      kit.catalog,
    );
  const detach = () =>
    new DetachProblemUseCase(kit.authorization, kit.repository, kit.transactions, kit.readiness);
  const reorderProblems = () =>
    new ReorderChapterProblemsUseCase(
      kit.authorization,
      kit.repository,
      kit.transactions,
      kit.views,
    );
  const updateCourse = () =>
    new UpdateCourseUseCase(
      kit.authorization,
      kit.repository,
      kit.transactions,
      kit.views,
      kit.readiness,
    );

  // Luôn đọc state đã lưu: use case làm việc trên bản sao nạp từ repository.
  const chapterOf = (course: ReturnType<typeof draftCourse>, index = 0) =>
    kit.stored(course).chapters[index]!.id;
  const chaptersOf = (course: ReturnType<typeof draftCourse>) => kit.stored(course).chapters;

  describe('chapters', () => {
    it('adds a chapter at the end or at a position and returns the managed view', async () => {
      const course = kit.seed(draftCourse());

      await addChapter().execute(admin(), course.id.value, new ChapterTitle('A'));
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('B'));
      const view = await addChapter().execute(
        admin(),
        course.id.value,
        new ChapterTitle('First'),
        new ChapterDescription(null),
        0,
      );

      expect(view.chapters.map((c) => c.title)).toEqual(['First', 'A', 'B']);
    });

    it('rejects an out-of-range position and leaves state unchanged', async () => {
      const course = kit.seed(draftCourse());

      await expect(
        addChapter().execute(admin(), course.id.value, new ChapterTitle('A'), null, 5),
      ).rejects.toBeInstanceOf(DomainValidationError);
      expect(chaptersOf(course)).toHaveLength(0);
      expect(kit.repository.saveCount).toBe(0);
    });

    it('rejects the 51st chapter (AC-013)', async () => {
      const course = kit.seed(draftCourse());
      for (let i = 0; i < 50; i += 1) {
        await addChapter().execute(admin(), course.id.value, new ChapterTitle(`C${i}`));
      }

      await expect(
        addChapter().execute(admin(), course.id.value, new ChapterTitle('one too many')),
      ).rejects.toBeInstanceOf(DomainValidationError);
      expect(chaptersOf(course)).toHaveLength(50);
    });

    it('reports an unknown chapter with the typed ChapterNotFound error', async () => {
      const course = kit.seed(draftCourse());

      await expect(
        updateChapter().execute(
          admin(),
          course.id.value,
          ChapterId.from('00000000-0000-4000-8000-0000000000aa'),
          new ChapterTitle('X'),
          undefined,
        ),
      ).rejects.toBeInstanceOf(ChapterNotFound);
    });

    it('rejects a reorder that is not exactly the current set (AC-009)', async () => {
      const course = kit.seed(draftCourse());
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('A'));
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('B'));
      const [a, b] = chaptersOf(course).map((c) => c.id);
      const stranger = ChapterId.from('00000000-0000-4000-8000-0000000000aa');

      for (const bad of [[a!], [a!, stranger], [a!, a!]]) {
        await expect(
          reorderChapters().execute(admin(), course.id.value, bad),
        ).rejects.toBeInstanceOf(DomainValidationError);
      }
      expect(chaptersOf(course).map((c) => c.id.value)).toEqual([a!.value, b!.value]);

      const view = await reorderChapters().execute(admin(), course.id.value, [b!, a!]);
      expect(view.chapters.map((c) => c.id)).toEqual([b!.value, a!.value]);
    });

    it('rejects edits to an ON_HOLD course', async () => {
      const course = kit.seed();
      course.publish();
      course.hold();

      await expect(
        addChapter().execute(admin(), course.id.value, new ChapterTitle('A')),
      ).rejects.toBeInstanceOf(InvalidCourseState);
    });
  });

  describe('attach and detach problems', () => {
    it('attaches a published problem at a position', async () => {
      const course = kit.seed(draftCourse());
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('A'));
      kit.catalog.setProblem(OTHER_PROBLEM);
      const chapterId = chapterOf(course);

      await attach().execute(admin(), course.id.value, chapterId, new ProblemReference(PROBLEM_ID));
      const view = await attach().execute(
        admin(),
        course.id.value,
        chapterId,
        new ProblemReference(OTHER_PROBLEM),
        0,
      );

      expect(view.chapters[0]!.problems.map((p) => p.problemId)).toEqual([
        OTHER_PROBLEM,
        PROBLEM_ID,
      ]);
    });

    it.each([
      ['unknown problem', undefined],
      ['deleted problem', { isDeleted: true }],
    ])('refuses a %s with one indistinguishable error', async (_name, state) => {
      const course = kit.seed(draftCourse());
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('A'));
      if (state) kit.catalog.setProblem(OTHER_PROBLEM, state);

      const error = await attach()
        .execute(admin(), course.id.value, chapterOf(course), new ProblemReference(OTHER_PROBLEM))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ProblemNotAttachableError);
      expect((error as Error).message).toBe('Problem is not attachable');
      expect(chaptersOf(course)[0]!.problemRefs).toHaveLength(0);
    });

    it.each(['DRAFT', 'ON_HOLD'] as const)(
      "lets an ADMIN attach another ADMIN's %s problem without showing it to learners",
      async (publishStatus) => {
        const course = kit.seed(draftCourse());
        await addChapter().execute(admin(), course.id.value, new ChapterTitle('A'));
        kit.catalog.setProblem(OTHER_PROBLEM, { publishStatus, createdBy: OTHER_ID });

        await attach().execute(
          admin(),
          course.id.value,
          chapterOf(course),
          new ProblemReference(OTHER_PROBLEM),
        );

        expect((await kit.views.toLearner(kit.stored(course))).chapters[0]!.problems).toEqual([]);
      },
    );

    it('rejects the same problem twice, in the same or another chapter (AC-018)', async () => {
      const course = kit.seed(courseWithProblem());
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('Two'));

      for (const index of [0, 1]) {
        await expect(
          attach().execute(
            admin(),
            course.id.value,
            chapterOf(course, index),
            new ProblemReference(PROBLEM_ID),
          ),
        ).rejects.toBeInstanceOf(ProblemAlreadyInCourse);
      }
    });

    it('rejects the 51st problem in a chapter (AC-013)', async () => {
      const course = kit.seed(draftCourse());
      await addChapter().execute(admin(), course.id.value, new ChapterTitle('A'));
      for (let i = 0; i < 50; i += 1) {
        const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
        kit.catalog.setProblem(id);
        await attach().execute(
          admin(),
          course.id.value,
          chapterOf(course),
          new ProblemReference(id),
        );
      }
      const extra = '00000000-0000-4000-8000-0000000fffff';
      kit.catalog.setProblem(extra);

      await expect(
        attach().execute(admin(), course.id.value, chapterOf(course), new ProblemReference(extra)),
      ).rejects.toBeInstanceOf(DomainValidationError);
      expect(chaptersOf(course)[0]!.problemRefs).toHaveLength(50);
    });

    it('rejects a reorder that is not exactly the chapter set (AC-009)', async () => {
      const course = kit.seed(courseWithProblem());

      await expect(
        reorderProblems().execute(admin(), course.id.value, chapterOf(course), [
          new ProblemReference(OTHER_PROBLEM),
        ]),
      ).rejects.toBeInstanceOf(DomainValidationError);
      expect(chaptersOf(course)[0]!.problemRefs.map((p) => p.value)).toEqual([PROBLEM_ID]);
    });
  });

  describe('keeping a published course publishable (FR-019, AC-019)', () => {
    const publishedWithTwoProblems = async () => {
      const course = kit.seed(courseWithProblem());
      kit.catalog.setProblem(OTHER_PROBLEM);
      kit.catalog.setProblem(THIRD_PROBLEM, { publishStatus: 'DRAFT' });
      await attach().execute(
        admin(),
        course.id.value,
        chapterOf(course),
        new ProblemReference(OTHER_PROBLEM),
      );
      course.publish();
      return course;
    };

    it('rejects detaching the only published problem and leaves state unchanged (AC-019)', async () => {
      const course = kit.seed(courseWithProblem());
      course.publish();
      const savesBefore = kit.repository.saveCount;

      await expect(
        detach().execute(
          admin(),
          course.id.value,
          chapterOf(course),
          new ProblemReference(PROBLEM_ID),
        ),
      ).rejects.toBeInstanceOf(CourseNotReadyError);
      expect(kit.repository.saveCount).toBe(savesBefore);
    });

    it('allows detaching one of two published problems', async () => {
      const course = await publishedWithTwoProblems();

      await detach().execute(
        admin(),
        course.id.value,
        chapterOf(course),
        new ProblemReference(OTHER_PROBLEM),
      );

      expect(chaptersOf(course)[0]!.problemRefs.map((p) => p.value)).toEqual([PROBLEM_ID]);
    });

    it('rejects removing the last chapter holding the only published problem', async () => {
      const course = kit.seed(courseWithProblem());
      course.publish();

      await expect(
        removeChapter().execute(admin(), course.id.value, chapterOf(course)),
      ).rejects.toBeInstanceOf(CourseNotReadyError);
      expect(chaptersOf(course)).toHaveLength(1);
    });

    it('lets a draft course drop its problems freely', async () => {
      const course = kit.seed(courseWithProblem());

      await detach().execute(
        admin(),
        course.id.value,
        chapterOf(course),
        new ProblemReference(PROBLEM_ID),
      );

      expect(chaptersOf(course)[0]!.problemRefs).toHaveLength(0);
    });

    it('updates title/description of a published, still-ready course in place', async () => {
      const course = kit.seed(courseWithProblem());
      course.publish();

      const view = await updateCourse().execute(admin(), course.id.value, {
        title: new CourseTitle('New title'),
        description: new CourseDescription('**ok** markdown'),
      });

      expect(view).toMatchObject({ title: 'New title', status: 'PUBLISHED' });
    });

    it('allows another ADMIN to update the course', async () => {
      const course = kit.seed(courseWithProblem());

      await expect(
        updateCourse().execute(admin(OTHER_ID), course.id.value, {
          title: new CourseTitle('x'),
        }),
      ).resolves.toMatchObject({ title: 'x' });
      expect(kit.stored(course).title.value).toBe('x');
    });
  });
});
