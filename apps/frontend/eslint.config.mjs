import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/build/*",
      "tsconfig.json",
      "remix.config.js",
      "app/gql/*",
      "app/hooks/use-toast.ts",
    ],
  },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginJsxA11y.flatConfigs.recommended,
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: pluginReactHooks.configs.recommended.rules,
  },
  { settings: { react: { version: "detect" } } },
  {
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // Ignores eslint no-unused-vars errors if vars, args or error are prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
