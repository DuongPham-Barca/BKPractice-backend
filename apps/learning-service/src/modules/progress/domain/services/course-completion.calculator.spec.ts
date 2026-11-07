import { CourseCompletionCalculator } from './course-completion.calculator';

import { CompletionCount } from '@/modules/progress/domain/value-objects';

describe('Course completion', () => {
  const calculator = new CourseCompletionCalculator();
  const solvedAt = new Date('2026-11-07T00:00:00Z');

  it('counts only Problems in the visible structure, preserving chapter and problem order', () => {
    const result = calculator.calculate(
      {
        courseId: 'course',
        chapters: [
          { chapterId: 'second', problemIds: ['b', 'c', 'a'] },
          { chapterId: 'empty', problemIds: [] },
          { chapterId: 'first', problemIds: ['d'] },
        ],
      },
      new Map([
        ['a', solvedAt],
        ['b', solvedAt],
        ['outside-course', solvedAt],
      ]),
    );
    expect(result).toEqual({
      courseId: 'course',
      solved: 2,
      total: 4,
      chapters: [
        { chapterId: 'second', solved: 2, total: 3 },
        { chapterId: 'empty', solved: 0, total: 0 },
        { chapterId: 'first', solved: 0, total: 1 },
      ],
      solvedProblems: [
        { problemId: 'b', solvedAt },
        { problemId: 'a', solvedAt },
      ],
    });
  });

  it('accepts a visible Course without any visible Problems', () => {
    expect(calculator.calculate({ courseId: 'course', chapters: [] }, new Map())).toEqual({
      courseId: 'course',
      solved: 0,
      total: 0,
      chapters: [],
      solvedProblems: [],
    });
    expect(new CompletionCount(0, 0)).toEqual({ solved: 0, total: 0 });
  });

  it.each([
    [-1, 0],
    [2, 1],
    [0, -1],
    [0.5, 1],
    [0, Infinity],
  ])('rejects invalid solved/total %s/%s', (solved, total) => {
    expect(() => new CompletionCount(solved, total)).toThrow(RangeError);
  });
});
