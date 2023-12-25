import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

function mapGlobals(globals) {
  return Object.fromEntries(
    Object.entries(globals).map(([name, isMutable]) => [
      name,
      isMutable ? 'writable' : 'readonly'
    ])
  );
}

export default [
  {
    ignores: ['templates/**/*.js']
  },
  js.configs.recommended,
  {
    files: ['nightwatch.conf.cjs', 'lib/**/*.js', 'bin/*.js', 'eslint.config.js'],
    languageOptions: {
      globals: mapGlobals(globals.node)
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...mapGlobals(globals.node),
        it: 'readonly',
        test: 'readonly',
        after: 'readonly',
        before: 'readonly',
        describe: 'readonly',
        afterEach: 'readonly',
        beforeEach: 'readonly'
      }
    }
  },
  {
    files: ['client/*.js'],
    languageOptions: {
      globals: mapGlobals(globals.browser)
    }
  },
  {
    plugins: {
      '@stylistic/js': stylistic
    },
    rules: {
      'eqeqeq': ['error', 'smart'],
      'no-extra-boolean-cast': 0,
      'curly': ['error', 'all'],
      'no-console': ['error', { 'allow': ['error'] }],
      'no-debugger': 1,
      'no-trailing-spaces': 1,
      'no-else-return': 2,
      'no-extra-bind': 0,
      'no-implicit-coercion': 0,
      'no-useless-call': 0,
      'no-return-assign': 0,
      'eol-last': 1,
      'no-unused-vars': 0,
      'no-extra-semi': 0,
      'comma-dangle': 2,
      'no-underscore-dangle': 0,
      'no-lone-blocks': 0,
      'array-bracket-spacing': 2,
      'brace-style': [2, '1tbs', { 'allowSingleLine': true }],
      'comma-spacing': 2,
      'comma-style': 2,
      'key-spacing': 2,
      'one-var': ['error', 'never'],
      'semi-style': ['error', 'last'],
      'space-in-parens': ['error', 'never'],
      'keyword-spacing': [2, { 'before': true, 'after': true }],
      'prefer-const': ['warn'],
      '@stylistic/js/quotes': ['error', 'single'],
      '@stylistic/js/semi': ['error', 'always', { 'omitLastInOneLineBlock': true }],
      '@stylistic/js/space-infix-ops': 1,
      '@stylistic/js/padding-line-between-statements': ['error', { 'blankLine': 'always', 'prev': '*', 'next': 'return' }],
      '@stylistic/js/indent': ['error', 2, { 'SwitchCase': 1 }],
      '@stylistic/js/object-curly-spacing': ['warn', 'always']
    }
  }
];
