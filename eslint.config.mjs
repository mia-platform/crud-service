import globals from "globals"
import pluginNode from 'eslint-plugin-n'

export default [
    {
        name: 'Ignored files',
        ignores: [
            'node_modules/**/*',
            'docs/**/*',
            'dist/**/*',
            'build/**/*',
            'tap-snapshots/**/*',
            "bench/**/*.js",
            '.vscode/**/*',
            '.idea/**/*',
            '.gitignore',
            'Dockerfile',
            '.local'
        ]
    },
    {
        files: ["**/*.js"],
        languageOptions: {sourceType: "commonjs"}
    },
    {
        name: 'Base config',
        files: ['**/*.{cjs,js}'],
        languageOptions: {ecmaVersion: 14, sourceType: "commonjs", globals: {...globals.node}},
        linterOptions: {reportUnusedDisableDirectives: 'warn'},
        plugins: {
            n: pluginNode,
        },
        rules: {
            "for-direction": "error",
            "getter-return": "error",
            "no-async-promise-executor": "error",
            "no-await-in-loop": "error",
            "no-compare-neg-zero": "error",
            "no-cond-assign": "error",
            "no-console": "error",
            "no-constant-condition": "error",
            "no-control-regex": "error",
            "no-debugger": "error",
            "no-dupe-args": "error",
            "no-dupe-keys": "error",
            "no-duplicate-case": "error",
            "no-empty": "error",
            "no-empty-character-class": "error",
            "no-ex-assign": "error",
            "no-extra-boolean-cast": "error",
            "no-extra-parens": ["error", "functions"],
            "no-extra-semi": "error",
            "no-func-assign": "error",
            "no-inner-declarations": "error",
            "no-invalid-regexp": "error",
            "no-irregular-whitespace": "error",
            "no-misleading-character-class": "error",
            "no-obj-calls": "error",
            "no-prototype-builtins": "error",
            "no-regex-spaces": "error",
            "no-sparse-arrays": "error",
            "no-template-curly-in-string": "error",
            "no-unexpected-multiline": "error",
            "no-unreachable": "error",
            "no-unsafe-finally": "error",
            "no-unsafe-negation": "error",
            "require-atomic-updates": "error",
            "use-isnan": "error",
            "valid-typeof": ["error", { "requireStringLiterals": true }],
            "array-callback-return": "error",
            "block-scoped-var": "error",
            "curly": "error",
            "default-case": ["error", { "commentPattern": "^skip\\sdefault" }],
            "eqeqeq": "error",
            "guard-for-in": "error",
            "no-caller": "error",
            "no-case-declarations": "error",
            "no-else-return": "error",
            "no-empty-function": "error",
            "no-empty-pattern": "error",
            "no-eq-null": "error",
            "no-eval": "error",
            "no-extend-native": "error",
            "no-extra-bind": "error",
            "no-extra-label": "error",
            "no-fallthrough": "error",
            "no-floating-decimal": "error",
            "no-global-assign": "error",
            "no-implicit-coercion": "error",
            "no-implicit-globals": "error",
            "no-implied-eval": "error",
            "no-iterator": "error",
            "no-labels": "error",
            "no-lone-blocks": "error",
            "no-loop-func": "error",
            "no-multi-spaces": "error",
            "no-new": "error",
            "no-new-func": "error",
            "no-new-wrappers": "error",
            "no-octal": "error",
            "no-octal-escape": "error",
            "no-param-reassign": "error",
            "no-proto": "error",
            "no-redeclare": ["error", { "builtinGlobals": false }],
            "no-return-assign": "error",
            "no-return-await": "error",
            "no-script-url": "error",
            "no-self-assign": "error",
            "no-self-compare": "error",
            "no-sequences": "error",
            "no-throw-literal": "error",
            "no-unmodified-loop-condition": "error",
            "no-unused-expressions": "error",
            "no-unused-labels": "error",
            "no-useless-call": "error",
            "no-useless-concat": "error",
            "no-useless-escape": "error",
            "no-useless-return": "error",
            "no-void": "error",
            "no-with": "error",
            "prefer-promise-reject-errors": "error",
            "vars-on-top": "error",
            "wrap-iife": "error",
            "strict": ["error", "global"],
            "no-delete-var": "error",
            "no-shadow": ["error", {
                "builtinGlobals": true,
                "allow": [
                    "fastify",
                    "next"
                ]
            }],
            "no-shadow-restricted-names": "error",
            "no-undef": "error",
            "no-undef-init": "error",
            "no-unused-vars": [
                "error",
                { "caughtErrors": "all", "caughtErrorsIgnorePattern": "^err" }
            ],
            "no-use-before-define": ["error", { "functions": false }],
            "callback-return": ["error", ["callback", "cb", "next", "done"]],
            "global-require": "error",
            "handle-callback-err": "error",
            "no-new-require": "error",
            "no-path-concat": "error",
            "no-process-exit": "error",
            "no-sync": "warn",
            "array-bracket-spacing": ["error", "never"],
            "block-spacing": ["error", "always"],
            "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
            "camelcase": ["error", {
                "properties": "never",
                "ignoreDestructuring": true
            }],
            "comma-dangle": ["error", {
                "arrays": "always-multiline",
                "objects": "always-multiline",
                "imports": "always-multiline",
                "exports": "always-multiline",
                "functions": "ignore"
            }],
            "comma-spacing": "error",
            "comma-style": "error",
            "computed-property-spacing": ["error", "never"],
            "eol-last": "error",
            "func-call-spacing": "error",
            "func-name-matching": "error",
            "func-names": ["error", "as-needed"],
            "func-style": ["error", "declaration", { "allowArrowFunctions": true }],
            "id-blacklist": ["error", "e", "er", "err", "cb"],
            "id-length": ["error", {
                "min": 2,
                "properties": "never",
                "exceptions": ["_", "i", "j", "x", "y", "z"]
            }],
            "indent": ["error", 2],
            "jsx-quotes": "error",
            "key-spacing": "error",
            "keyword-spacing": "error",
            "line-comment-position": "error",
            "linebreak-style": "error",
            "lines-around-comment": "error",
            "max-depth": ["error", 4],
            "max-len": ["error", {
                "code": 120,
                "tabWidth": 2,
                "ignoreTrailingComments": true,
                "ignoreUrls": true,
                "ignoreStrings": true,
                "ignoreTemplateLiterals": true,
                "ignoreRegExpLiterals": true
            }],
            "max-lines": ["error", {
                "max": 500,
                "skipBlankLines": true,
                "skipComments": true
            }],
            "max-nested-callbacks": ["error", 4],
            "max-statements": ["error", 25, { "ignoreTopLevelFunctions": true }],
            "max-statements-per-line": ["error", { "max": 2 }],
            "new-parens": "error",
            "newline-per-chained-call": ["error", { "ignoreChainWithDepth": 2 }],
            "no-lonely-if": "error",
            "no-mixed-operators": "error",
            "no-mixed-spaces-and-tabs": "error",
            "no-multi-assign": "error",
            "no-multiple-empty-lines": "error",
            "no-nested-ternary": "error",
            "no-new-object": "error",
            "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }],
            "no-tabs": "error",
            "no-trailing-spaces": "error",
            "no-underscore-dangle": ["error", {
                "allow": [
                    "_id",
                    "_s",
                    "_p",
                    "_q",
                    "_l",
                    "_sk",
                    "_st",
                    "__STATE__"
                ],
                "allowAfterThis": true,
                "allowAfterSuper": true
            }],
            "no-unneeded-ternary": "error",
            "no-whitespace-before-property": "error",
            "nonblock-statement-body-position": "error",
            "object-curly-spacing": ["error", "always"],
            "object-property-newline": ["error", { "allowMultiplePropertiesPerLine": true }],
            "one-var-declaration-per-line": "error",
            "operator-assignment": "error",
            "operator-linebreak": ["error", "before"],
            "padded-blocks": ["error", "never"],
            "prefer-object-spread": "warn",
            "quote-props": ["error", "as-needed", {
                "unnecessary": false
            }],
            "quotes": ["error", "single", {
                "avoidEscape": true,
                "allowTemplateLiterals": true
            }],
            "semi": ["error", "never"],
            "semi-spacing": "error",
            "space-before-blocks": "error",
            "space-before-function-paren": ["error", "never"],
            "space-in-parens": "error",
            "space-infix-ops": "error",
            "space-unary-ops": "error",
            "spaced-comment": "error",
            "template-tag-spacing": ["error", "always"],
            "arrow-spacing": "error",
            "constructor-super": "error",
            "generator-star-spacing": "error",
            "no-class-assign": "error",
            "no-confusing-arrow": ["error", { "allowParens": true }],
            "no-const-assign": "error",
            "no-dupe-class-members": "error",
            "no-duplicate-imports": "error",
            "no-new-symbol": "error",
            "no-this-before-super": "error",
            "no-useless-computed-key": "error",
            "no-useless-constructor": "error",
            "no-useless-rename": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-arrow-callback": ["error", { "allowNamedFunctions": true }],
            "prefer-const": "error",
            "prefer-destructuring": "error",
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            "prefer-template": "error",
            "require-yield": "error",
            "rest-spread-spacing": "error",
            "sort-imports": 0,
            "symbol-description": "error",
            "template-curly-spacing": "error",
            "yield-star-spacing": "error",

            // https://github.com/eslint-community/eslint-plugin-n/tree/master/docs/rules
            'n/callback-return': ['error', ['callback', 'cb', 'next', 'done']],
        },
    },
    {
        name: 'Tests overrides',
        files: [
            'tests/**/*.js',
            'tests/expectedSchemas/*.js',
            'tests/utils.js',
        ],
        rules: {
            'id-length': 'off',
            'max-lines': 'off',
            "no-await-in-loop": "off",
            "default-case": "off",
            "guard-for-in": "off",
            "no-shadow": "off",
            "max-depth": "off",
            "max-nested-callbacks": "off",
            "max-statements": "off",
            "no-unused-vars": "off"
        },
    },
];