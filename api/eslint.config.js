import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "coverage/"] },
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: globals.node,
    },
    settings: { "import/resolver": { node: { extensions: [".js"] } } },
    rules: {
      "no-console": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling"],
          "newlines-between": "always",
        },
      ],
      "import/extensions": ["error", "ignorePackages"],
      "import/no-extraneous-dependencies": [
        "error",
        { devDependencies: ["tests/**", "scripts/**", "eslint.config.js"] },
      ],
    },
  },
  {
    files: ["src/lib/logger.js"],
    rules: { "no-console": "off" },
  },
];
