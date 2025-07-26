import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript - more permissive but still catch real issues
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": ["warn", {
        "ts-ignore": "allow-with-description",
        "ts-expect-error": "allow-with-description"
      }],
      
      // React - allow common patterns
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      
      // Next.js - more flexible
      "@next/next/no-img-element": "warn",
      
      // General - still catch bugs but be reasonable
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-debugger": "error",
      "no-unreachable": "error",
      "no-undef": "error",
    }
  }
];

export default eslintConfig;
