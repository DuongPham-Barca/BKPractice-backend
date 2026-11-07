export class ChapterNotFound extends Error {
  constructor(public readonly chapterId: string) {
    super('Chapter not found');
    this.name = 'ChapterNotFound';
  }
}
