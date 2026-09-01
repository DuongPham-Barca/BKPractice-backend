import { Injectable } from '@nestjs/common';

import type { LanguageRunner } from './language-runner';

@Injectable()
export class CppRunner implements LanguageRunner {
  readonly language = 'cpp' as const;
  readonly image = 'bkpractice-judge-cpp:latest';
  readonly sourceFile = 'main.cpp';
  readonly compileCommand = [
    'g++',
    '-std=c++20',
    '-O2',
    '-pipe',
    'main.cpp',
    '-o',
    'main',
  ] as const;
  readonly executeCommand = ['./main'] as const;
}
