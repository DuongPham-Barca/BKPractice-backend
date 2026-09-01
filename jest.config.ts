import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverageFrom: ['apps/**/*.ts', 'libs/**/*.ts', '!**/main.ts', '!**/migrations/**'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/libs/common/src$1',
    '^@app/config(.*)$': '<rootDir>/libs/config/src$1',
    '^@app/contracts(.*)$': '<rootDir>/libs/contracts/src$1',
    '^@app/shared(.*)$': '<rootDir>/libs/shared/src$1',
  },
};

export default config;
