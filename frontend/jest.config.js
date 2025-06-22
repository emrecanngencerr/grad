// jest.config.js
module.exports = {
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './.babelrc' }],
  },
  transformIgnorePatterns: [
    // This is the key. We tell Jest NOT to ignore axios in node_modules,
    // so babel-jest WILL process it using your Babel config (which outputs CJS).
    '/node_modules/(?!(axios|axios-mock-adapter|react-router-dom|@testing-library)/)',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // We remove the specific axios path mapping because 'exports' prevents it.
    // We will rely on babel-jest transforming axios if it's an ESM module.
    // '^axios$': require.resolve('axios'), // This is usually the default and fine if transform works
  },
  setupFiles: ['<rootDir>/src/setupTests.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
};