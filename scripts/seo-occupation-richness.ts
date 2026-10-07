/**
 * Data richness of every public occupation page (docs/seo-occupation-audit.md). Read-only; no database, no network.
 *   npx tsx scripts/seo-occupation-richness.ts [--json]
 */
import { occupationRichness } from "../lib/occupations/richness";
import { getUniqueOccupations } from "../lib/occupations/seo";

const rows = getUniqueOccupations().map((o) => ({ o, r: occupationRichness(o) }));
const n = rows.length;
const pct = (c: number) => `${c} (${((c / n) * 100).toFixed(1)}%)`;
const count = (f: (x: (typeof rows)[number]) => boolean) => rows.filter(f).length;

const out = {
  pages_per_locale: n,
  signals: {
    authority: pct(count((x) => x.r.authority)),
    sourced_fee: pct(count((x) => x.r.fee)),
    national_list: pct(count((x) => x.r.nationalList)),
    any_state_list_190_491: pct(count((x) => x.r.statesWithList.length > 0)),
    invitation_benchmark: pct(count((x) => x.r.invitation)),
    last_verified_date: pct(count((x) => x.r.verifiedDates.length > 0)),
  },
  states_with_list_distribution: Object.fromEntries([0, 1, 2, 3, 4, 5].map((k) => [k, count((x) => x.r.statesWithList.length === k)])),
  score_distribution: Object.fromEntries([0, 1, 2, 3, 4, 5].map((k) => [k, count((x) => x.r.score === k)])),
  tiers: { rich: pct(count((x) => x.r.tier === "rich")), medium: pct(count((x) => x.r.tier === "medium")), thin: pct(count((x) => x.r.tier === "thin")) },
  thin_examples: rows.filter((x) => x.r.tier === "thin").slice(0, 8).map((x) => `${x.o.anzsco_code} ${x.o.occupation_name} [${x.o.visa_lists?.join("/") ?? "-"}]`),
  rich_examples: rows.filter((x) => x.r.tier === "rich").slice(0, 8).map((x) => `${x.o.anzsco_code} ${x.o.occupation_name}`),
};
console.log(JSON.stringify(out, null, 2));
