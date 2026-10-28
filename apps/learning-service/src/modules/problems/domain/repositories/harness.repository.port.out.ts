import type { SupportedLanguage } from '@app/contracts';
import type { Harness } from '@learning/modules/problems/domain/harness.aggregate';

export interface HarnessRepository {
  find(problemId: string, language: SupportedLanguage): Promise<Harness | null>;
  upsert(harness: Harness): Promise<void>;
  remove(problemId: string, language: SupportedLanguage): Promise<boolean>;
}
