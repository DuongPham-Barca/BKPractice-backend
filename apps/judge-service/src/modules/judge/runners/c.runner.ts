import { Injectable } from '@nestjs/common';

import type { LanguageRunner } from './language-runner';

@Injectable()
export class CRunner implements LanguageRunner {
  readonly language = 'c' as const;
  readonly image = 'bkpractice-judge-c:latest';
  readonly sourceFile = 'main.c';
  readonly compileCommand = ['gcc', '-std=c17', '-O2', '-pipe', 'main.c', '-o', 'main'] as const;
  readonly executeCommand = ['./main'] as const;
}
