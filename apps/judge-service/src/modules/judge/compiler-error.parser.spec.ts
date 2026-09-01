import { parseCompilerError } from './compiler-error.parser';

describe('parseCompilerError', () => {
  it('extracts GCC line, column and message', () => {
    expect(parseCompilerError("main.cpp:5:20: error: expected ';' before '}'")).toEqual({
      line: 5,
      column: 20,
      message: "expected ';' before '}'",
    });
  });
});
