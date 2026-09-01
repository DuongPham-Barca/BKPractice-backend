import type { SupportedLanguage } from '@app/contracts';

export interface LanguageRunner {
  readonly language: SupportedLanguage;
  readonly image: string;
  readonly sourceFile: string;
  readonly compileCommand: readonly string[] | null;
  readonly executeCommand: readonly string[];
}
