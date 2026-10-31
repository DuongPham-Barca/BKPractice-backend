import { DomainValidationError } from '../errors/domain-validation.error';

import { ChapterDescription, CourseDescription } from './course-content';

describe('restricted Markdown in descriptions (FR-014, AC-012)', () => {
  const dangerous = [
    '<script>alert(1)</script>',
    'hello <SCRIPT src=x></SCRIPT>',
    '<iframe src="https://evil"></iframe>',
    '<img src=x onerror=alert(1)>',
    '<a onclick = "x()">link</a>',
    '[click](javascript:alert(1))',
    '[x](data:text/html;base64,AAAA)',
    '<style>body{display:none}</style>',
  ];

  it.each(dangerous)('rejects %s in a course description', (text) => {
    expect(() => new CourseDescription(text)).toThrow(DomainValidationError);
  });

  it.each(dangerous)('rejects %s in a chapter description', (text) => {
    expect(() => new ChapterDescription(text)).toThrow(DomainValidationError);
  });

  it('accepts ordinary Markdown, code fences and the word "on"', () => {
    const markdown =
      '# Title\n\n- item **bold** `code`\n\n```c\nint a = 1 < 2;\n```\n\nturn on the lights';
    expect(new CourseDescription(markdown).value).toBe(markdown);
    expect(new ChapterDescription(markdown).value).toBe(markdown);
  });

  it('accepts null and enforces the length limits (20000 / 5000)', () => {
    expect(new CourseDescription(null).value).toBeNull();
    expect(new ChapterDescription(null).value).toBeNull();
    expect(() => new CourseDescription('a'.repeat(20001))).toThrow(DomainValidationError);
    expect(new CourseDescription('a'.repeat(20000)).value).toHaveLength(20000);
    expect(() => new ChapterDescription('a'.repeat(5001))).toThrow(DomainValidationError);
    expect(new ChapterDescription('a'.repeat(5000)).value).toHaveLength(5000);
  });
});
