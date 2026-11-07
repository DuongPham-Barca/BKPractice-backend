export class CompletionCount {
  constructor(
    readonly solved: number,
    readonly total: number,
  ) {
    if (
      !Number.isSafeInteger(solved) ||
      !Number.isSafeInteger(total) ||
      solved < 0 ||
      total < solved
    ) {
      throw new RangeError('Completion requires integers with 0 <= solved <= total');
    }
    Object.freeze(this);
  }
}
