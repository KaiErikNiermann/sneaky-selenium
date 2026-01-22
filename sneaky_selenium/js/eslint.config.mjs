// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Deprecation detection - enabled but we'll use inline comments for intentional deprecations
      '@typescript-eslint/no-deprecated': 'error',
      
      // Best practices - warnings for safety in browser mocking context
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      
      // Allow non-null assertions since we're doing browser mocking
      '@typescript-eslint/no-non-null-assertion': 'off',
      
      // Relax some rules for IIFE patterns and browser mocking
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off', // Empty stubs are intentional for mocking
      '@typescript-eslint/unbound-method': 'off', // Methods are intentionally unbound for proxying
      '@typescript-eslint/no-unnecessary-condition': 'off', // Browser feature detection patterns
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/triple-slash-reference': 'off', // Needed for global type augmentation
      '@typescript-eslint/no-redundant-type-constituents': 'off', // Explicit union with fallback string
      '@typescript-eslint/restrict-plus-operands': 'off', // Intentional coercion for toString
      '@typescript-eslint/no-base-to-string': 'off', // Intentional stringification
      '@typescript-eslint/no-implied-eval': 'off', // Function constructor needed for dynamic code
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      'no-prototype-builtins': 'off', // Prototype checking is intentional for stealth
    },
  },
  {
    files: ['src/**/*.ts'],
  },
  {
    ignores: ['*.js', 'node_modules/**'],
  }
);
