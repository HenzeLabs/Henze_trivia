/**
 * Jest configuration for API integration tests
 * These tests require Next.js and experimental VM modules
 */

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/api.*.test.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
  ],
  collectCoverageFrom: [
    "server.js",
    "!node_modules/**",
  ],
  coverageDirectory: "coverage-api",
  verbose: true,
  testTimeout: 30000, // API tests may take longer
  // Transform ESM modules
  transform: {},
};
