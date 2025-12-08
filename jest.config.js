module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'middleware/**/*.js',
    'services/**/*.js',
    'controllers/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
  moduleNameMapper: {
    '^../config/database$': '<rootDir>/tests/__mocks__/database.js',
    '^../../config/database$': '<rootDir>/tests/__mocks__/database.js'
  }
};
