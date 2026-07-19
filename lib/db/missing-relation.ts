// Shared by any query against a Drizzle table that may not exist yet in the
// live database (see CLAUDE.md — full_check_usage, full_check_waitlist,
// leads, visa_types, visa_structured_data, source_snapshots are declared in
// db/schema.ts but not yet created live). Callers catch the query error and
// check it here instead of letting it 500 the page.
export function isMissingRelationError(error: unknown, relationName: string): boolean {
  const target = relationName.toLowerCase();

  const scan = (value: unknown): boolean => {
    if (!value) return false;
    if (typeof value === "string") {
      return value.toLowerCase().includes(target) || value.includes("42P01");
    }
    if (typeof value !== "object") return false;

    const record = value as Record<string, unknown>;
    if (record.code === "42P01") return true;
    return Object.values(record).some((entry) => scan(entry));
  };

  return scan(error);
}

// Same idea as isMissingRelationError, but for a missing COLUMN on a table
// that does exist -- e.g. schema.prisma declares a field before the live DB
// has caught up (Prisma surfaces this as error code P2022, distinct from the
// P1xxx "table missing" family; the underlying Postgres code is 42703).
// Callers should catch and fall back instead of letting the page 500.
export function isMissingColumnError(error: unknown, columnName: string): boolean {
  const target = columnName.toLowerCase();

  const scan = (value: unknown): boolean => {
    if (!value) return false;
    if (typeof value === "string") {
      return (
        (value.toLowerCase().includes(target) && value.toLowerCase().includes("does not exist")) ||
        value.includes("42703")
      );
    }
    if (typeof value !== "object") return false;

    const record = value as Record<string, unknown>;
    if (record.code === "P2022" || record.code === "42703") return true;
    return Object.values(record).some((entry) => scan(entry));
  };

  return scan(error);
}
