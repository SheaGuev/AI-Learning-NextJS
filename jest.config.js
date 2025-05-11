module.exports = {
  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['next/babel'] }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'lucide-react': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide-react|react-markdown|remark-gfm)/).+\\.js$'
  ]
}; 