import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Created on first use, not at import: `next build` imports every route module to collect page data, and a build must not need a database URL
// (or touch the network). A missing URL still fails loudly, at the first query.
let instance: Db | undefined;
function getDb(): Db {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not defined");
    }
    instance = drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get: (_target, prop) => {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
