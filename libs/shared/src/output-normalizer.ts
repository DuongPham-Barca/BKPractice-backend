export function normalizeJudgeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd();
}
