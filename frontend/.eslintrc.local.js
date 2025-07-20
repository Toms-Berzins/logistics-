module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-assign-module-variable': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    'react/display-name': 'warn',
    'prefer-const': 'warn'
  }
}