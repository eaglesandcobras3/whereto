import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/browser",
              message:
                "Do not use the browser Supabase client. Use lib/auth/* server actions or getSessionUser() instead.",
            },
            {
              name: "@supabase/ssr",
              importNames: ["createBrowserClient"],
              message:
                "Do not use createBrowserClient. Use lib/auth/* server actions or getSessionUser() instead.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
