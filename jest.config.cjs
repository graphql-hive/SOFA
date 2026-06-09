module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  resolver: 'bob-the-bundler/jest-resolver',
  transformIgnorePatterns: ['/node_modules/(?!@scalar/)'],
};
