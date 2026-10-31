import { assertValidDate } from './value-object.utils';

export class DeletedMarker {
  readonly deletedAt: Date | null;
  private constructor(deletedAt: Date | null) {
    this.deletedAt = deletedAt;
    Object.freeze(this);
  }
  static none(): DeletedMarker {
    return new DeletedMarker(null);
  }
  static at(date: Date): DeletedMarker {
    return new DeletedMarker(assertValidDate(date, 'deletedAt'));
  }
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
