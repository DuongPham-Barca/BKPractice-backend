import { Injectable } from '@nestjs/common';

import type { LanguageRunner } from './language-runner';

@Injectable()
export class JavaRunner implements LanguageRunner {
  readonly language = 'java' as const;
  readonly image = 'bkpractice-judge-java:latest';
  readonly sourceFile = 'Main.java';
  readonly compileCommand = ['javac', '-encoding', 'UTF-8', 'Main.java'] as const;
  readonly executeCommand = ['java', '-Xss16m', 'Main'] as const;
}
