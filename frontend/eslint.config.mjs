import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Desabilitar regras muito restritivas
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Permitir setState em effects (comum em Next.js)
      "react-hooks/set-state-in-effect": "off",
      // Permitir componentes criados durante render (tooltips, etc)
      "react-hooks/static-components": "off",
      // Avisar sobre dependências faltantes mas não bloquear
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "temp/**",
    "frontend-temp/**",
  ]),
]);

export default eslintConfig;
