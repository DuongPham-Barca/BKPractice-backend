import type { SupportedLanguage } from '@app/contracts';

import { ApplicationError } from './application.error';

export class HarnessNotFoundError extends ApplicationError {
  readonly code = 'HARNESS_NOT_FOUND';

  constructor(
    readonly problemId: string,
    readonly language: SupportedLanguage,
  ) {
    super('Harness not found');
  }
}
