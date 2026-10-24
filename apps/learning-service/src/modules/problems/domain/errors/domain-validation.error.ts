export class DomainValidationError extends Error {
  readonly code = 'DOMAIN_VALIDATION';

  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainValidationError';
  }
}
