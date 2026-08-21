/**
 * Named import formats for the Manual Data Upload form (Admin Data Sync
 * panel, app/actions/admin/import-data.ts). Distinct from
 * lib/constants/migration-sources.ts's MIGRATION_SOURCES: that list is the
 * 10 "go find the data yourself" link cards (any government source, any
 * URL); this is the small set of known FILE LAYOUTS the import action knows
 * how to parse. A source format maps to a fixed `state` value written onto
 * every imported InvitationFeedItem row, and a `defaultSubclass` used when
 * the file itself has no subclass column.
 */
export type SourceFormatId = "wa-invitation-rounds" | "federal-189" | "generic-state-data";

export type SourceFormat = {
  id: SourceFormatId;
  label: string;
  state: string;
  defaultSubclass: string;
};

export const SOURCE_FORMATS: SourceFormat[] = [
  {
    id: "wa-invitation-rounds",
    label: "WA - Invitation Rounds",
    state: "Western Australia",
    defaultSubclass: "190",
  },
  {
    id: "federal-189",
    label: "Federal 189",
    state: "Federal",
    defaultSubclass: "189",
  },
  {
    id: "generic-state-data",
    label: "Generic State Data",
    state: "Unspecified",
    defaultSubclass: "190",
  },
];

export function getSourceFormat(id: string): SourceFormat | undefined {
  return SOURCE_FORMATS.find((format) => format.id === id);
}
