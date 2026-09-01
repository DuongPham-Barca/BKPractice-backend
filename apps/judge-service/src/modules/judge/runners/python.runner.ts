import { Injectable } from '@nestjs/common';

import type { LanguageRunner } from './language-runner';

@Injectable()
export class PythonRunner implements LanguageRunner {
  readonly language = 'python' as const;
  readonly image = 'bkpractice-judge-python:latest';
  readonly sourceFile = 'main.py';
  readonly compileCommand = ['python3', '-m', 'py_compile', 'main.py'] as const;
  readonly executeCommand = ['python3', '-I', 'main.py'] as const;
}
