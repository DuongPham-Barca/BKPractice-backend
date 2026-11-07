export class ProblemAlreadyInCourse extends Error {
  constructor(public readonly problemId: string) {
    super('Problem is already attached to this course');
    this.name = 'ProblemAlreadyInCourse';
  }
}
