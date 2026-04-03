import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  setupFilesAfterFramework: ['./test/setup.ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts', '!test/**'],
  coverageThreshold: {
    global: { lines: 70, functions: 70 },
  },
  moduleNameMapper: {
    '^@smartbite/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
}

export default config
