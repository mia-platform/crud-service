'use strict'

module.exports = {
  'extends': '@mia-platform/eslint-config-mia',
  'parserOptions': {
    'ecmaVersion': 2022,
    'ecmaFeatures': {
      'jsx': true,
    },
  },
  'ignorePatterns': [
    'bench',
  ],
  'overrides': [
    {
      'files': [
        'tests/**/*.js',
        'tests/expectedSchemas/*.js',
      ],
      'rules': {
        'id-length': 'off',
        'max-lines': 'off',
      },
    },
    {
      'files': [
        'lib/**/*.js',
      ],
      'rules': {
        'valid-jsdoc': 'off',
      },
    },
  ],
}
