require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not defined");
}

/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: "./db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: databaseUrl,
  },
};
