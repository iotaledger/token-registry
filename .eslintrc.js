module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
      "plugin:import/errors",
      "plugin:import/warnings",
      "plugin:import/typescript",
      "plugin:unicorn/recommended"
  ],
  parserOptions: {
    project: 'tsconfig.json',
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
      "unicorn/prevent-abbreviations": [
          "off"
      ]
  }
}

