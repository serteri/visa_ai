/**
 * Real occupation <-> state-occupation-list matching, from the git-committed derived data in
 * src/data/state-occupation-lists/ (see scripts/generate-state-occupation-lists.ts, which regenerates
 * those files from data/knowledge/State Immigrations/<state> -- gitignored, so only the generated JSON is
 * ever read at runtime).
 *
 * NOTE on a second, pre-existing mechanism: this codebase already has an independent, DB-backed occupation-
 * match pipeline -- scripts/sync-state-occupation-lists.ts populates the StateOccupationListEntry Prisma
 * table from the same data/knowledge source files, and lib/state-intelligence.ts's getStateOccupationMatches
 * could read it. Phase 3b retired that pipeline from the report path (the table is never populated, and its
 * NSW lookup compared 4-digit unit-group codes to 6-digit ANZSCO codes); the table, the sync script and
 * getStateOccupationMatches are left in place, unused. This module is now the only occupation-match source:
 * a pure, synchronous, fully testable function over git-committed static data, used ONLY for the
 * informational line (see calculateStateNominationTracker's occupationMatchNote) -- the state-match score
 * does not depend on occupation matching at all, and no database connection is needed (so it works in CI).
 *
 * Coverage (see the Phase 1 inventory and Phase 2a review this was built from):
 *   ACT, NT, QLD, WA  -- real per-occupation, ANZSCO-coded lists            -> MATCH / NOT_ON_LIST
 *   TAS, VIC          -- no state-specific list; eligibility runs off the
 *                        Australian Government's own national skilled list -> NOT_APPLICABLE
 *   NSW               -- only 4-digit ANZSCO UNIT GROUP codes, not full
 *                        6-digit occupations -- cannot support real
 *                        occupation-level matching                          -> UNIT_GROUP_ONLY
 *   SA                -- no occupation-list document exists in data/knowledge at all                 -> NO_DATA
 */
import actData from "@/src/data/state-occupation-lists/act.json";
import ntData from "@/src/data/state-occupation-lists/nt.json";
import qldData from "@/src/data/state-occupation-lists/qld.json";
import waData from "@/src/data/state-occupation-lists/wa.json";
import nswUnitGroupsData from "@/src/data/state-occupation-lists/nsw-unit-groups.json";
import { getNationalVisaSubclasses } from "@/lib/readiness/occupation-eligibility";

export type StateOccupationSubclass = "190" | "491";

export type OccupationMatchResultType = "MATCH" | "NOT_ON_LIST" | "UNIT_GROUP_ONLY" | "NO_DATA" | "NOT_APPLICABLE";

export type OccupationMatchResult = {
  type: OccupationMatchResultType;
  stateCode: string;
  subclass: StateOccupationSubclass;
  anzscoCode: string;
  /** MATCH only: the occupation title as written in the state's own source list. */
  occupationTitle?: string;
  /** MATCH only: true when this row's subclass eligibility is inferred rather than directly stated in the
   *  source document -- currently only ACT's 259 unmarked rows (see act.json's _provenance and the Phase 2a
   *  review of ACT Migration.pdf). */
  inferred?: boolean;
  /** MATCH/NOT_ON_LIST only: any licensing/pathway note carried from the source row. */
  notes?: string;
  /** UNIT_GROUP_ONLY only. */
  unitGroupCode?: string;
  unitGroupName?: string;
  onUnitGroupList?: boolean;
  /** NOT_APPLICABLE only: whether the occupation is on the relevant national skilled list for this subclass. */
  onNationalList?: boolean;
};

type StateListRow = {
  anzscoCode: string;
  occupationTitle: string;
  subclass190: boolean;
  subclass491: boolean;
  notes?: string;
  act491DefaultInferred?: true;
};

function buildIndex(rows: StateListRow[]): Map<string, StateListRow> {
  return new Map(rows.map((r) => [r.anzscoCode, r]));
}

const ACT_INDEX = buildIndex((actData as { occupations: StateListRow[] }).occupations);
const NT_INDEX = buildIndex((ntData as { occupations: StateListRow[] }).occupations);
const QLD_INDEX = buildIndex((qldData as { occupations: StateListRow[] }).occupations);
const WA_INDEX = buildIndex((waData as { occupations: StateListRow[] }).occupations);

type NswUnitGroupRow = { unitGroupCode: string; unitGroupName: string; subclass190: boolean; subclass491: boolean };
const NSW_UNIT_GROUPS = new Map(
  (nswUnitGroupsData as { occupations: NswUnitGroupRow[] }).occupations.map((r) => [r.unitGroupCode, r])
);

function matchFromIndex(
  index: Map<string, StateListRow>,
  stateCode: string,
  anzscoCode: string,
  subclass: StateOccupationSubclass
): OccupationMatchResult {
  const row = index.get(anzscoCode);
  const onList = row ? (subclass === "190" ? row.subclass190 : row.subclass491) : false;
  if (!row || !onList) {
    return { type: "NOT_ON_LIST", stateCode, subclass, anzscoCode };
  }
  return {
    type: "MATCH",
    stateCode,
    subclass,
    anzscoCode,
    occupationTitle: row.occupationTitle,
    notes: row.notes,
    ...(row.act491DefaultInferred ? { inferred: true } : {}),
  };
}

/**
 * The one entry point: never fabricates MATCH or NOT_ON_LIST for a state/subclass this module has no real
 * data for -- SA is always NO_DATA, NSW is always UNIT_GROUP_ONLY (never a full occupation-level verdict),
 * TAS/VIC always defer to the national list via NOT_APPLICABLE.
 */
export function matchOccupationToState(
  anzscoCode: string,
  stateCode: string,
  subclass: StateOccupationSubclass
): OccupationMatchResult {
  const code = anzscoCode.trim();
  const state = stateCode.trim().toUpperCase();

  switch (state) {
    case "ACT":
      return matchFromIndex(ACT_INDEX, state, code, subclass);
    case "NT":
      return matchFromIndex(NT_INDEX, state, code, subclass);
    case "QLD":
      return matchFromIndex(QLD_INDEX, state, code, subclass);
    case "WA":
      return matchFromIndex(WA_INDEX, state, code, subclass);
    case "SA":
      return { type: "NO_DATA", stateCode: state, subclass, anzscoCode: code };
    case "NSW": {
      const unitGroupCode = code.slice(0, 4);
      const group = NSW_UNIT_GROUPS.get(unitGroupCode);
      const onUnitGroupList = group ? (subclass === "190" ? group.subclass190 : group.subclass491) : false;
      return {
        type: "UNIT_GROUP_ONLY",
        stateCode: state,
        subclass,
        anzscoCode: code,
        unitGroupCode,
        unitGroupName: group?.unitGroupName,
        onUnitGroupList,
      };
    }
    case "TAS":
    case "VIC": {
      const onNationalList = getNationalVisaSubclasses(code).includes(subclass);
      return { type: "NOT_APPLICABLE", stateCode: state, subclass, anzscoCode: code, onNationalList };
    }
    default:
      // Unrecognized state code -- no data source could exist for it either way.
      return { type: "NO_DATA", stateCode: state, subclass, anzscoCode: code };
  }
}

/** Runs matchOccupationToState for every subclass a state actually offers, for the combined PDF line. */
export function matchOccupationToStateAllSubclasses(
  anzscoCode: string,
  stateCode: string,
  subclasses: readonly StateOccupationSubclass[]
): OccupationMatchResult[] {
  return subclasses.map((subclass) => matchOccupationToState(anzscoCode, stateCode, subclass));
}
