import { Course } from '@learning/modules/courses/domain/course.aggregate';
import {
  ChapterDescription,
  ChapterTitle,
  CourseDescription,
  CourseSlug,
  CourseTitle,
} from '@learning/modules/courses/domain/value-objects/course-content';
import {
  CreatedBy,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects/identifiers';

describe('Course aggregate', () => {
  const createdBy = new CreatedBy('00000000-0000-4000-8000-000000000031');

  it('creates a draft course', () => {
    const course = Course.create({
      slug: new CourseSlug('intro-c'),
      title: new CourseTitle('Intro C'),
      description: new CourseDescription(null),
      createdBy,
    });

    expect(course.status).toBe('DRAFT');
    expect(course.chapters).toHaveLength(0);
    expect(course.isEditable).toBe(true);
  });

  it('enforces chapter limit', () => {
    const course = Course.create({
      slug: new CourseSlug('c'),
      title: new CourseTitle('C'),
      description: new CourseDescription(null),
      createdBy,
    });

    for (let i = 0; i < 50; i += 1) {
      course.addChapter({
        title: new ChapterTitle(`Ch ${i}`),
        description: new ChapterDescription(null),
      });
    }

    expect(() =>
      course.addChapter({
        title: new ChapterTitle('Ch 51'),
        description: new ChapterDescription(null),
      }),
    ).toThrow();
  });

  it('prevents duplicate problem across course', () => {
    const course = Course.create({
      slug: new CourseSlug('c2'),
      title: new CourseTitle('C2'),
      description: new CourseDescription(null),
      createdBy,
    });
    const chapterId = course.addChapter({
      title: new ChapterTitle('Ch'),
      description: new ChapterDescription(null),
    });
    const problem = new ProblemReference('00000000-0000-4000-8000-000000000001');

    course.addProblemToChapter(chapterId, problem);

    expect(() => course.addProblemToChapter(chapterId, problem)).toThrow();
  });

  it('publish transitions draft to published at aggregate level (readiness checked by caller)', () => {
    const course = Course.create({
      slug: new CourseSlug('c3'),
      title: new CourseTitle('C3'),
      description: new CourseDescription(null),
      createdBy,
    });

    course.publish();
    expect(course.status).toBe('PUBLISHED');
  });
});
