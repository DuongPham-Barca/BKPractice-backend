import { JUDGE_STATUSES } from '@app/contracts';
import type { JudgeResult } from '@app/contracts';
import { z } from 'zod';

const judgeResultSchema = z
  .object({
    executionId: z.string().min(1),
    submissionId: z.string().min(1),
    mode: z.enum(['RUN', 'SUBMIT']),
    status: z.enum(JUDGE_STATUSES),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    compileOutput: z.string().optional(),
    runtimeMs: z.number().int().nonnegative().optional(),
    memoryKb: z.number().int().nonnegative().optional(),
    passedTests: z.number().int().nonnegative().optional(),
    totalTests: z.number().int().nonnegative().optional(),
    score: z.number().nonnegative().optional(),
    error: z
      .object({
        line: z.number().int().positive().optional(),
        column: z.number().int().positive().optional(),
        message: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();

export function parseJudgeResult(value: unknown): JudgeResult | null {
  const parsed = judgeResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
