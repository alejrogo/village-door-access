import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { databaseHostEndsWithPooler, migrateDatabaseUrl } from "../src/env.ts";

const pooled =
  "postgresql://user:secret@ep-cool-pooler.eu-central-1.aws.neon.tech/neondb";
const direct =
  "postgresql://user:secret@ep-cool.eu-central-1.aws.neon.tech/neondb";
const local = "postgresql://postgres:postgres@127.0.0.1:5432/village";

test("Neon pooler endpoint ends with -pooler", () => {
  assert.equal(databaseHostEndsWithPooler(pooled), true);
  assert.equal(
    databaseHostEndsWithPooler(
      "postgresql://user:secret@ep-cool-pooler.c-3.eu-central-1.aws.neon.tech/neondb"
    ),
    true
  );
  assert.equal(databaseHostEndsWithPooler(direct), false);
  assert.equal(databaseHostEndsWithPooler(local), false);
});

test("pooler host requires DATABASE_URL_UNPOOLED before migrate", () => {
  assert.throws(
    () => migrateDatabaseUrl({ DATABASE_URL: pooled }),
    /DATABASE_URL_UNPOOLED/u
  );
  assert.throws(
    () =>
      migrateDatabaseUrl({
        DATABASE_URL: pooled,
        DIRECT_URL: direct,
      }),
    /DATABASE_URL_UNPOOLED/u
  );
});

test("migrate prefers the unpooled URL when the host is a pooler", () => {
  assert.equal(
    migrateDatabaseUrl({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
    }),
    direct
  );
});

test("typed env rejects a pooler DATABASE_URL without DATABASE_URL_UNPOOLED", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "-e",
      'import { env } from "./src/env.ts"; console.log(env.DATABASE_URL);',
    ],
    {
      encoding: "utf-8",
      env: { DATABASE_URL: pooled },
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr ?? "", /DATABASE_URL_UNPOOLED/u);
});

test("non-pooler host may migrate with DATABASE_URL alone", () => {
  assert.equal(migrateDatabaseUrl({ DATABASE_URL: local }), local);
  assert.equal(
    migrateDatabaseUrl({
      DATABASE_URL: local,
      DIRECT_URL: direct,
    }),
    direct
  );
});
