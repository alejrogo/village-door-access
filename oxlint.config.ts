import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";

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
  jsPlugins: shadcn.jsPlugins,
  rules: {
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
