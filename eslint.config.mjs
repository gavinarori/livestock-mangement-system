import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
    ...nextVitals,
    ...nextTs,

    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "react-hooks/exhaustive-deps": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/purity": "off",
            "react-hooks/static-components": "off",
            "react-hooks/immutability": "off",
            "react/no-unescaped-entities": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "react-hooks/preserve-manual-memoization": "off",

        },
    },

    globalIgnores([
        ".next/**",
        "node_modules/**",
        "build/**",
        "out/**",
    ]),
]);