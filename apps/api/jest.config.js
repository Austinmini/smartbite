// Load test env vars before anything else runs
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET_TEST = 'test-secret-do-not-use-in-production-ever'

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts', '!test/**'],
  coverageThreshold: {
    global: { lines: 70, functions: 70 },
  },
  moduleNameMapper: {
    '^@smartbite/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  testTimeout: 10000,
  forceExit: true,
}
