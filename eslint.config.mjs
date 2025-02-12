import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Determine the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize compatibility helper for flat config
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    // Extend recommended Next.js rules
    extends: ["next/core-web-vitals", "next/typescript"],
    languageOptions: {
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json", // Ensure your tsconfig.json is referenced
      },
    },
    rules: {
      // Integrate Prettier formatting with ESLint. Adjust options as needed.
      "prettier/prettier": [
        "error",
        {
          singleQuote: true,
          endOfLine: "auto",
          semi: false,
          trailingComma: "es5",
        },
      ],
      // Customize TypeScript ESLint rules
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // React specific rules – Next.js does not require React in scope
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Common rule adjustments
      "import/no-extraneous-dependencies": "warn",
    },
    settings: {
      // Next.js specific setting to help resolve paths
      next: {
        rootDir: __dirname,
      },
    },
  }),
];

export default eslintConfig;


// import { dirname } from "path";
// import { fileURLToPath } from "url";
// import { FlatCompat } from "@eslint/eslintrc";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const compat = new FlatCompat({
//   baseDirectory: __dirname,
// });

// const eslintConfig = [
//   ...compat.extends("next/core-web-vitals", "next/typescript"),
  
// ];

// export default eslintConfig;
