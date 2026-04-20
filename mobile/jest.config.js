/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-native',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.ts',
    '^expo-speech$': '<rootDir>/__mocks__/expo-speech.ts',
    '^expo-av$': '<rootDir>/__mocks__/expo-av.ts',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.ts',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterFramework: ['@testing-library/react-native/extend-expect'],
  testPathPattern: '.*\\.test\\.(ts|tsx)$',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
