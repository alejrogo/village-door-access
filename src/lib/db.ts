import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Neon (or any Postgres) when `DATABASE_URL` is set. There is no PGLite
 * fallback — Prisma talks the Postgres protocol only. Typed env:
 * `src/env.ts`.
 */
function requireDatabaseUrl(): string {
  const url =
    typeof env.DATABASE_URL === "string" ? env.DATABASE_URL.trim() : "";
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Point it at Neon or local Postgres."
    );
  }
  return url;
}

const globalRef = globalThis as typeof globalThis & {
  __prisma__?: PrismaClient;
};

function createPrisma(): PrismaClient {
  if (typeof window !== "undefined") {
    throw new TypeError(
      "@/lib/db is server-only — call getPrisma() from a createServerFn " +
        "handler or a server route loader, never from client code."
    );
  }
  const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });
  return new PrismaClient({ adapter });
}

/**
 * Shared, **server-only** Prisma Client. Memoized on globalThis so Vite HMR
 * does not open a second pool. Schema lives in `prisma/`; Neon applies it
 * with `prisma migrate deploy` during `pnpm build`.
 */
export function getPrisma(): PrismaClient {
  globalRef.__prisma__ ??= createPrisma();
  return globalRef.__prisma__;
}
