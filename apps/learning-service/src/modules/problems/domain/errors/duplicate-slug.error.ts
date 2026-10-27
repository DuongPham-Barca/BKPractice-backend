export class DuplicateSlugError extends Error {
  readonly code = 'DUPLICATE_SLUG';

  constructor(readonly slug: string) {
    super(`A problem with slug "${slug}" already exists`);
    this.name = 'DuplicateSlugError';
  }
}
