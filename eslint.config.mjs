import stylistic from "@stylistic/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "generated/**",
      "coverage/**",
      "work/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@stylistic": stylistic },
    rules: {
      "no-else-return": ["error", { allowElseIf: false }],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
        {
          blankLine: "always",
          prev: "*",
          next: ["function", "if", "for", "while", "do", "switch", "try"],
        },
        {
          blankLine: "always",
          prev: ["function", "if", "for", "while", "do", "switch", "try"],
          next: "*",
        },
      ],
    },
  },
];
