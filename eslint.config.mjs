import next from 'eslint-config-next';
import prettier from 'eslint-config-prettier/flat';

const importOrder = [
  'error',
  {
    groups: ['builtin', 'external', 'internal', ['sibling', 'parent', 'index'], 'type'],
    pathGroups: [
      { pattern: '{react*,react*/**}', group: 'external', position: 'before' },
      { pattern: '@public/**', group: 'internal', position: 'after' },
      { pattern: '@styles/**', group: 'internal', position: 'after' },
      { pattern: '@api/**', group: 'internal', position: 'after' },
      { pattern: '@utils/**', group: 'internal', position: 'after' },
      { pattern: '@config/**', group: 'internal', position: 'after' },
      { pattern: '@provider/**', group: 'internal', position: 'after' },
      { pattern: '@atoms/**', group: 'internal', position: 'after' },
      { pattern: '@components/**', group: 'internal', position: 'after' },
      { pattern: '@lib/**', group: 'internal', position: 'after' }
    ],
    pathGroupsExcludedImportTypes: ['type'],
    alphabetize: { order: 'asc', caseInsensitive: true },
    'newlines-between': 'always'
  }
];

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...next,
  prettier,
  {
    rules: {
      'import/order': importOrder,
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart']
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '**/*.config.{js,mjs}'
    ]
  }
];

export default config;
