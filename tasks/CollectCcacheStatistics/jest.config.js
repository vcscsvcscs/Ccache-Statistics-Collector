module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tasks/CollectCcacheStatistics/__tests__/*.test.js'],
  moduleFileExtensions: ['js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};