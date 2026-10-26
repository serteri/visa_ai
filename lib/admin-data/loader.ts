import { unstable_cache } from "next/cache";

import { buildSeedPrograms } from "./seed";
import { seedStateData, toSnapshot } from "./snapshot";
import type { AdminStateData } from "./types";

/**
 * The cached snapshot every reader uses (docs/admin-data-design.md D.1). Order: the admin's rows (a state without a row uses its seed row,
 * so a state never disappears), else the bundled seed when the table is empty, the database is unreachable, or there is no DATABASE_URL.
 * Reading never throws: a report or an answer is never lost because the snapshot could not be read.
 *
 * Cached across instances with a tag; the admin actions expire the tag on save (updateTag), and 60 s is the safety net.
 */

export const ADMIN_STATE_DATA_TAG = "admin-state-data";

async function loadFromDb(): Promise<AdminStateData> {
  // Loaded here, not at the top: importing this module (the report builders do) must not create the Prisma client.
  const { prismaStateProgramStore } = await import("./store-prisma");
  const rows = await prismaStateProgramStore.list();
  if (rows.length === 0) return seedStateData();
  const programs = { ...buildSeedPrograms(), ...Object.fromEntries(rows.map((p) => [p.stateCode, p])) };
  const lists = await prismaStateProgramStore.listOccupationLists().catch(() => []); // the table may not exist yet: the bundled lists stay
  const snapshot = toSnapshot(programs, "db", new Date().toISOString());
  return lists.length > 0 ? { ...snapshot, occupationLists: Object.fromEntries(lists.map((l) => [l.stateCode, l])) } : snapshot;
}

const cached = unstable_cache(loadFromDb, ["admin-state-data"], { tags: [ADMIN_STATE_DATA_TAG], revalidate: 60 });

/**
 * The snapshot for statically generated public pages (the occupation and visa pages). It is read once per process, directly from the database, outside
 * unstable_cache: a cache entry with `revalidate` (or a tag) would make every page that reads it re-render on that timer and on every admin save, one ISR
 * write per page. The pages are built at deployment, so a new deployment is what publishes new state data to them. Reading never throws (the seed is the
 * fallback, as in getAdminStateData); a failure is logged because the pages then keep the seed until the next deployment.
 */
let staticPagesSnapshot: Promise<AdminStateData> | null = null;
export function getAdminStateDataForStaticPages(): Promise<AdminStateData> {
  if (process.env.ADMIN_DATA_MODE === "seed" || !process.env.DATABASE_URL) return Promise.resolve(seedStateData());
  staticPagesSnapshot ??= loadFromDb().catch((dbErr) => {
    console.error("[admin-data] static pages: could not read state programs; using the bundled seed", dbErr instanceof Error ? dbErr.message : dbErr);
    return seedStateData();
  });
  return staticPagesSnapshot;
}

export async function getAdminStateData(): Promise<AdminStateData> {
  // ADMIN_DATA_MODE=seed: never read the database (the test bootstrap sets it; Prisma loads .env by itself, so an unset DATABASE_URL is not enough).
  if (process.env.ADMIN_DATA_MODE === "seed" || !process.env.DATABASE_URL) return seedStateData();
  try {
    return await cached();
  } catch {
    // Outside the Next runtime (a script) the cache is unavailable; inside it, a failing database is not cached. Try the database directly once, then the seed.
    try {
      return await loadFromDb();
    } catch (dbErr) {
      console.error("[admin-data] could not read state programs; using the bundled seed", dbErr instanceof Error ? dbErr.message : dbErr);
      return seedStateData();
    }
  }
}
