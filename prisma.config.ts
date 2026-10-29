import { defineConfig } from "prisma/config";

import { migrateDatabaseUrl } from "./src/env.ts";

// `src/env.ts` loads `.env.development.local` before validating. This
// import runs that load, then resolves the migrate URL (unpooled when
// the DATABASE_URL host ends with -pooler).
const migrateUrl = migrateDatabaseUrl();

export default defineConfig({
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
  ...(migrateUrl ? { datasource: { url: migrateUrl } } : {}),
});
