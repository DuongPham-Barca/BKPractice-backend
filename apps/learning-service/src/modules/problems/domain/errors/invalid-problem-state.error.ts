export class InvalidProblemState extends Error {
  readonly code = 'INVALID_PROBLEM_STATE';

  constructor(
    readonly state: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidProblemState';
  }
}
