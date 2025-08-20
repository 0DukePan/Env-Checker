module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src", "<rootDir>/extension/src"],
    testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
    transform: {
      "^.+\\.ts$": "ts-jest",
    },
    collectCoverageFrom: ["src/**/*.ts", "extension/src/**/*.ts", "!**/*.d.ts", "!**/node_modules/**", "!**/dist/**"],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    moduleNameMapping: {
      "^@/(.*)$": "<rootDir>/src/$1",
      "^@extension/(.*)$": "<rootDir>/extension/src/$1",
    },
    testTimeout: 10000,
  }
  