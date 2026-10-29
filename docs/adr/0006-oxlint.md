---
status: accepted
---

# Lint and format with Ultracite Oxlint, not Biome

Village door access checks and formats with Ultracite 8.1.0, Oxlint 1.90.0, and Oxfmt 0.74.0. The Oxlint config extends Ultracite's core, React, and TanStack presets and the opt-in `@shadcn/lint` preset. Biome is not a dependency. Oxlint does not merge `env` from an extended preset, so the root config copies Ultracite's `core.env` (browser globals) and turns Node on as well: server functions, Prisma, and the scripts read `process.env`.

Function declarations stay. The Oxlint preset prefers expressions; rewriting every function would drop the hoisting this code relies on. Pre-commit runs `ultracite fix` through lint-staged, then `pnpm typecheck`. `pnpm test` stays on CI because it needs Postgres.

## Considered options

- Stay on Ultracite's Biome presets. One tool, but no `@shadcn/lint` and a smaller rule set.
- Oxlint with only `core.env` (browser). Server files would treat Node globals as missing.
- Oxlint expressions for every function. A much larger diff, and declarations used before their line would break.
