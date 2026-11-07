export class CourseProgressNotFoundError extends Error {
  constructor() {
    super('Course not found');
  }
}
