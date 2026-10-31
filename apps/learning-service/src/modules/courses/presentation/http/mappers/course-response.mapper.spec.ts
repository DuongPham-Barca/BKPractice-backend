import { Course } from '@learning/modules/courses/domain/course.aggregate';
import {
  ChapterDescription,
  ChapterTitle,
  CourseDescription,
  CourseSlug,
  CourseTitle,
  CreatedBy,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects';
import { OWNER_ID, PROBLEM_ID } from '@learning/modules/courses/testing/course-test.fakes';

import { toCourseListResponse, toCourseResponse } from './course-response.mapper';

describe('course response mapper', () => {
  const build = () => {
    const course = Course.create({
      slug: new CourseSlug('intro-c'),
      title: new CourseTitle('Intro C'),
      description: new CourseDescription('Mô tả'),
      createdBy: new CreatedBy(OWNER_ID),
    });
    const chapterId = course.addChapter({
      title: new ChapterTitle('Chapter 1'),
      description: new ChapterDescription(null),
    });
    course.addProblemToChapter(chapterId, new ProblemReference(PROBLEM_ID));
    return { course, chapterId };
  };

  it('flattens value objects into primitives and ISO dates', () => {
    const { course, chapterId } = build();

    const response = toCourseResponse(course);

    expect(response).toEqual({
      id: course.id.value,
      slug: 'intro-c',
      title: 'Intro C',
      description: 'Mô tả',
      status: 'DRAFT',
      deletedAt: null,
      chapters: [
        { id: chapterId.value, title: 'Chapter 1', description: null, problemIds: [PROBLEM_ID] },
      ],
      createdBy: OWNER_ID,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    });
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
  });

  it('exposes deletedAt for a soft-deleted course', () => {
    const { course } = build();
    course.publish();
    const at = new Date('2026-10-31T00:00:00.000Z');
    course.softDelete(at);

    expect(toCourseResponse(course).deletedAt).toBe(at.toISOString());
  });

  it('maps a page and keeps pagination metadata', () => {
    const { course } = build();

    const page = toCourseListResponse({ items: [course], total: 7, page: 2, limit: 1 });

    expect(page).toMatchObject({ total: 7, page: 2, limit: 1 });
    expect(page.items).toEqual([toCourseResponse(course)]);
  });
});
