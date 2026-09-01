import type { CompilerError } from '@app/contracts';

const compilerErrorPattern = /(?:^|\n)[^\n:]+:(\d+)(?::(\d+))?:\s*(?:fatal\s+)?error:\s*([^\n]+)/i;

export function parseCompilerError(output: string): CompilerError | undefined {
  const match = compilerErrorPattern.exec(output);
  if (!match) return undefined;
  const line = Number(match[1]);
  const column = match[2] ? Number(match[2]) : undefined;
  return { line, column, message: match[3]?.trim() || 'Compilation failed' };
}
