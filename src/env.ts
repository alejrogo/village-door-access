import { existsSync } from "node:fs";

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Local Docker values. Does not override variables already set (Vercel, CI).
 * Vite and the test runner load this file too; Prisma imports this module
 * before `prisma.config.ts` runs, so the load has to happen here.
 */
if (existsSync(".env.development.local")) {
  process.loadEnvFile(".env.development.local");
}

/**
 * Neon pooled hosts look like `ep-name-pooler.<region>.aws.neon.tech`.
 * The endpoint (first hostname label) ends with `-pooler`.
 */
export function databaseHostEndsWithPooler(connectionString: string): boolean {
  try {
    const endpoint = new URL(connectionString).hostname.split(".")[0] ?? "";
    return endpoint.endsWith("-pooler");
  } catch {
    return false;
  }
}

/**
 * URL for `prisma migrate deploy`. Prefers `DATABASE_URL_UNPOOLED`, then
 * `DIRECT_URL`, then `DATABASE_URL`. A pooler host must name the unpooled
 * URL — `DIRECT_URL` does not satisfy that. Empty when nothing is set, so
 * `prisma generate` still runs before a database exists.
 */
export function migrateDatabaseUrl(
  runtime: NodeJS.ProcessEnv = process.env
): string {
  const databaseUrl = runtime.DATABASE_URL?.trim() ?? "";
  const unpooled = runtime.DATABASE_URL_UNPOOLED?.trim() ?? "";
  const direct = runtime.DIRECT_URL?.trim() ?? "";
  if (databaseUrl && databaseHostEndsWithPooler(databaseUrl) && !unpooled) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is required when the DATABASE_URL host ends with -pooler."
    );
  }
  return unpooled || direct || databaseUrl;
}

const nonEmpty = z.string().trim().min(1);

/**
 * Vite typed env (`@t3-oss/env-core`, the equivalent of `@t3-oss/env-nextjs`).
 * Server-only. No `VITE_` keys are defined, so nothing here reaches the browser.
 * Operator session and Notice code still read `process.env` at call time.
 */
export const env = createEnv({
  server: {
    ADMIN_PASSWORD: nonEmpty.min(8).max(128).optional(),
    ADMIN_SESSION_SECRET: nonEmpty.optional(),
    DATABASE_URL: nonEmpty,
    DATABASE_URL_UNPOOLED: nonEmpty.optional(),
    DIRECT_URL: nonEmpty.optional(),
    NOTIFY_EMAIL: nonEmpty.email().optional(),
    NOTIFY_FROM: nonEmpty.optional(),
    RESEND_API_KEY: nonEmpty.optional(),
  },
  clientPrefix: "VITE_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // `prisma generate` imports this module before a database exists.
  skipValidation: !process.env.DATABASE_URL?.trim(),
  createFinalSchema: (shape, isServer) => {
    const schema = z.object(shape as z.ZodRawShape);
    if (!isServer) {
      return schema;
    }
    return schema.superRefine((value, ctx) => {
      const databaseUrl = value.DATABASE_URL;
      const unpooled = value.DATABASE_URL_UNPOOLED;
      if (
        typeof databaseUrl === "string" &&
        databaseHostEndsWithPooler(databaseUrl) &&
        typeof unpooled !== "string"
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "DATABASE_URL_UNPOOLED is required when the DATABASE_URL host ends with -pooler.",
          path: ["DATABASE_URL_UNPOOLED"],
        });
      }
      const password = value.ADMIN_PASSWORD;
      const secret = value.ADMIN_SESSION_SECRET;
      if (typeof password === "string" && typeof secret !== "string") {
        ctx.addIssue({
          code: "custom",
          message:
            "ADMIN_SESSION_SECRET is required when ADMIN_PASSWORD is set.",
          path: ["ADMIN_SESSION_SECRET"],
        });
      }
    });
  },
});
