module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "player.ui.test.js", // Playwright test - run separately
    "api.game.test.js", // Requires Next.js with experimental VM modules
    "api.game.coreflows.test.js", // Requires Next.js with experimental VM modules
  ],
  collectCoverageFrom: [
    "GameRoom.js",
    "database.js",
    "questionMixer.js",
    "server.js",
    "!node_modules/**",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 10000,
};
