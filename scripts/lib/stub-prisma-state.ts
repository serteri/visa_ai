/**
 * Test bootstrap for the admin state data (lib/admin-data/loader.ts): installs a stubbed Prisma client on globalThis BEFORE lib/prisma is
 * imported (import this module first), so a test of the database path never makes a real connection. `stateProgramStub.findMany` is the
 * only thing the loader calls; a test replaces it to simulate rows or a database that is down.
 */
export const stateProgramStub = { findMany: async (..._args: unknown[]): Promise<unknown[]> => [] };

(globalThis as { prisma?: unknown }).prisma = {
  stateProgram: { findMany: (...args: unknown[]) => stateProgramStub.findMany(...args) },
  $disconnect: async () => undefined,
};
