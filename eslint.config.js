import globals from "globals";
import eslintConfig from "@mapc/eslint-config";

export default [
  ...eslintConfig,
  {
    languageOptions: { globals: globals.node },
    rules: {
      "react/prop-types": "off",
    },
  },
];
