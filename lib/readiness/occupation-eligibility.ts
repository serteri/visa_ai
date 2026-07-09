import occupationsData from "@/src/data/occupations.json";

export type SkilledSubclass = "189" | "190" | "491";

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
  visa_lists?: string[];
};

const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function parseAnzscoCode(occupation?: string): string | undefined {
  if (!occupation) return undefined;
  return occupation.match(/(\d{6})/)?.[1];
}

export function findOccupationRecord(occupation?: string): OccupationRecord | undefined {
  const code = parseAnzscoCode(occupation);
  if (code) {
    const byCode = OCCUPATION_ROWS.find((row) => row.anzsco_code === code);
    if (byCode) return byCode;
  }

  const query = normalize(occupation);
  if (!query) return undefined;

  const exact = OCCUPATION_ROWS.find((row) => normalize(row.occupation_name) === query);
  if (exact) return exact;

  return OCCUPATION_ROWS.find((row) => normalize(row.occupation_name).includes(query));
}

export function getEligibleSkilledSubclasses(occupation?: string): SkilledSubclass[] {
  const record = findOccupationRecord(occupation);
  if (!record) return [];

  const listMemberships = new Set(record.visa_lists ?? []);
  const subclasses: SkilledSubclass[] = [];

  if (listMemberships.has("MLTSSL")) {
    subclasses.push("189", "190", "491");
  } else {
    if (listMemberships.has("STSOL")) {
      subclasses.push("190", "491");
    }
    if (listMemberships.has("ROL")) {
      subclasses.push("491");
    }
  }

  return Array.from(new Set(subclasses));
}
