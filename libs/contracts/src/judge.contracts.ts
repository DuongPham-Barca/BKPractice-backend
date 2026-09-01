export const SUPPORTED_LANGUAGES = ['c', 'cpp', 'java', 'python'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const PROBLEM_TYPES = ['STANDARD', 'FUNCTION', 'OOP'] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];

export const JUDGE_STATUSES = [
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILE_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
] as const;
export type JudgeStatus = (typeof JUDGE_STATUSES)[number];

export interface JudgeTestCase {
  id?: string;
  stdin: string;
  expectedOutput?: string;
  score?: number;
}

export interface JudgeRequest {
  executionId: string;
  submissionId: string;
  mode: 'RUN' | 'SUBMIT';
  problemId?: string;
  problemType: ProblemType;
  language: SupportedLanguage;
  sourceCode: string;
  testCases: JudgeTestCase[];
  hiddenHarness?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface CompilerError {
  line?: number;
  column?: number;
  message: string;
}

export interface JudgeResult {
  executionId: string;
  submissionId: string;
  mode: 'RUN' | 'SUBMIT';
  status: JudgeStatus;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  runtimeMs?: number;
  memoryKb?: number;
  passedTests?: number;
  totalTests?: number;
  score?: number;
  error?: CompilerError;
}
