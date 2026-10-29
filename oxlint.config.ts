import { defineConfig } from "oxlint";
import { tailwindcss } from "oxlint-tailwindcss/config";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";

// Recommended Tailwind rules. `settings` do not survive `extends`, so the
// entry point and the plugin path stay on this root config, beside
// `@shadcn/lint`. jsx-a11y is already on via the Ultracite React preset,
// including the public Visitor pages (`src/routes/index.tsx`, `login.tsx`,
// `__root.tsx`).
const tailwind = tailwindcss();

// Oxlint does not merge `env` from extended presets, so the root config
// carries Ultracite's browser globals and the Node globals this server uses.
export default defineConfig({
  env: {
    ...core.env,
    node: true,
  },
  extends: [core, react, tanstack, shadcn],
  ignorePatterns: [
    ...core.ignorePatterns,
    "**/.nitro",
    "**/artifacts",
    "**/screenshots",
  ],
  jsPlugins: [...shadcn.jsPlugins, ...tailwind.jsPlugins],
  overrides: [
    {
      // shadcn/ui owns its appearance. Ultracite's preset also turns this
      // off; repeat it here so it stays off if extended overrides are dropped.
      files: ["src/components/ui/**"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-restyle": "off",
        "shadcn/require-static-classes": "off",
      },
    },
  ],
  settings: {
    tailwindcss: {
      entryPoint: "src/styles.css",
    },
  },
  rules: {
    ...tailwind.rules,
    // This repo names functions with declarations. Expressions would rewrite
    // every module and break the hoisting those declarations rely on.
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "no-use-before-define": [
      "error",
      { classes: true, functions: false, variables: true },
    ],
    "react/function-component-definition": [
      "error",
      { namedComponents: "function-declaration" },
    ],
  },
});
