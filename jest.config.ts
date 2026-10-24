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
    '^@gateway(.*)$': '<rootDir>/apps/api-gateway/src$1',
    '^@identity(.*)$': '<rootDir>/apps/identity-service/src$1',
    '^@learning(.*)$': '<rootDir>/apps/learning-service/src$1',
    '^@submission(.*)$': '<rootDir>/apps/submission-service/src$1',
    '^@judge(.*)$': '<rootDir>/apps/judge-service/src$1',
    '^@community(.*)$': '<rootDir>/apps/community-service/src$1',
  },
};

export default config;
