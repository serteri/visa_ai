/**
 * Named import formats for the Manual Data Upload form (Admin Data Sync
 * panel, app/actions/admin/import-data.ts). Distinct from
 * lib/constants/migration-sources.ts's MIGRATION_SOURCES: that list is the
 * 10 "go find the data yourself" link cards (any government source, any
 * URL); this is the full federal + state/territory list of file layouts
 * the import action knows about (though not all of them have a working
 * parser yet -- see `parser` below).
 */
export type SourceFormatId = "FEDERAL" | "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA";

/**
 * Which parser importMigrationData routes a format to:
 *   - "wa-nested": the block/state-machine parser built specifically for
 *     WA's export structure (sub-tables with heading rows + a separate
 *     monthly volume section) -- see parseWaInvitationRounds.
 *   - "generic-flat": a plain first-row-is-headers table reader
 *     (parseGenericFormat) -- used where no state-specific structure has
 *     been confirmed yet, as a best-effort fallback.
 *   - "not-implemented": no parser at all yet. Every state/territory
 *     publishes its invitation-round data in a genuinely different Excel/
 *     PDF layout (WA's turned out to be nested sub-tables, not a flat
 *     table) -- guessing a structure for one we haven't actually seen
 *     would silently produce wrong data, which is worse than a clear
 *     "not supported yet" error. Federal is the one exception kept on
 *     "generic-flat": SkillSelect's own dashboard exports are a
 *     conventional flat table.
 */
export type SourceFormatParser = "wa-nested" | "generic-flat" | "not-implemented";

export type SourceFormat = {
  id: SourceFormatId;
  label: string;
  state: string;
  defaultSubclass: string;
  parser: SourceFormatParser;
};

export const SOURCE_FORMATS: SourceFormat[] = [
  { id: "FEDERAL", label: "Federal 189/491", state: "Federal", defaultSubclass: "189", parser: "generic-flat" },
  { id: "ACT", label: "ACT - Canberra", state: "Australian Capital Territory", defaultSubclass: "190", parser: "not-implemented" },
  { id: "NSW", label: "NSW - New South Wales", state: "New South Wales", defaultSubclass: "190", parser: "not-implemented" },
  { id: "NT", label: "NT - Northern Territory", state: "Northern Territory", defaultSubclass: "491", parser: "not-implemented" },
  { id: "QLD", label: "QLD - Queensland", state: "Queensland", defaultSubclass: "190", parser: "not-implemented" },
  { id: "SA", label: "SA - South Australia", state: "South Australia", defaultSubclass: "190", parser: "not-implemented" },
  { id: "TAS", label: "TAS - Tasmania", state: "Tasmania", defaultSubclass: "190", parser: "not-implemented" },
  { id: "VIC", label: "VIC - Victoria", state: "Victoria", defaultSubclass: "190", parser: "not-implemented" },
  { id: "WA", label: "WA - Western Australia", state: "Western Australia", defaultSubclass: "190", parser: "wa-nested" },
];

export function getSourceFormat(id: string): SourceFormat | undefined {
  return SOURCE_FORMATS.find((format) => format.id === id);
}
