// StarBear — flat ESLint config.
// We deliberately do NOT import `eslint-config-next` because its bundled
// `@rushstack/eslint-patch` is broken against ESLint 9.39+ on this platform
// ("Failed to patch ESLint because the calling module was not recognized").
// See AGENTS.md > "Known sharp edges" for the background.
//
// If/when Next ships a fix, swap to `import next from 'eslint-config-next'`
// and spread `...next()` again.

import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'src/lib/db/migrations/**',
      'src/lib/db/sqlite-shim.cjs',
      'src/lib/db/sqlite-shim.d.cts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off', // apostrophes in JSX text are fine
      'react/no-unknown-property': 'off', // Radix/cmdk custom attributes
      // Next generates .next/types/routes.d.ts which requires a triple-slash ref.
      '@typescript-eslint/triple-slash-reference': 'off',
      // The CJS shim uses require(); that's its whole point.
      '@typescript-eslint/no-require-imports': 'off',
      // React 19 schedules setState in effects more gracefully; we don't cascade here.
      'react-hooks/set-state-in-effect': 'off',
      // Dialogs use autoFocus intentionally.
      'jsx-a11y/no-autofocus': 'off',
      // We pair labels with controls manually; the rule is too strict for our patterns.
      'jsx-a11y/label-has-associated-control': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // CJS shims (scripts/pretest-e2e.cjs, scripts/start-e2e.cjs) deliberately
      // use require(); the entire purpose of those files is to be CJS.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
