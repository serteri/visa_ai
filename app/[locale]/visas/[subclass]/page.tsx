import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";

import { db } from "@/db";
import { sourceSnapshots, visaStructuredData, visaTypes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── local types for JSONB fields ─────────────────────────────────────────────

type TestScores = {
  standard: number | string;
  elicos_10_weeks: number | string;
  elicos_20_weeks: number | string;
};

type PerSkillScores = {
  listening?: number | string;
  reading?: number | string;
  writing?: number | string;
  speaking?: number | string;
  overall?: number | string;
  note?: string;
  single_sitting_required?: boolean;
  single_skill_retake_accepted?: boolean;
  single_skill_retake_note?: string;
  [key: string]: unknown;
};

// Subclass 500 format
type EnglishRequirements500 = {
  test_taken_on_or_before_2025_08_06?: Record<string, TestScores>;
  test_taken_on_or_after_2025_08_07?: Record<string, TestScores>;
  notes?: string[];
};

// Subclass 482 format
type EnglishRequirements482 = {
  summary?: string;
  applies_to_streams?: string[];
  test_validity?: string;
  exemptions?: string[];
  passport_exemptions?: string[];
  online_tests_not_accepted?: { rule?: string; examples_not_accepted?: string[] };
  tests_taken_on_or_after_2025_08_07?: Record<string, PerSkillScores | string | boolean>;
  tests_taken_on_or_before_2025_08_06?: Record<string, PerSkillScores | string | boolean>;
  tests_taken_on_or_after_2025_09_13?: Record<string, PerSkillScores | string | boolean>;
  tests_taken_before_2025_09_13?: Record<string, PerSkillScores | string | boolean>;
  labour_agreement_stream_note?: string;
  notes?: string[];
};

type FinancialRequirements = {
  living_costs_12_months?: Record<string, string>;
  annual_income_option?: Record<string, string>;
  schooling_costs_per_child?: string;
  travel_costs_guidance?: Record<string, string>;
};

// ─── data fetching ────────────────────────────────────────────────────────────

async function getVisaDetails(subclass: string) {
  const [visaRow] = await db
    .select()
    .from(visaTypes)
    .where(eq(visaTypes.subclass, subclass))
    .limit(1);

  if (!visaRow) return null;

  const [structured] = await db
    .select()
    .from(visaStructuredData)
    .where(eq(visaStructuredData.visa_type_id, visaRow.id))
    .limit(1);

  const snapshots = await db
    .select({
      id: sourceSnapshots.id,
      pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      source_url: sourceSnapshots.source_url,
      captured_at: sourceSnapshots.captured_at,
      notes: sourceSnapshots.notes,
    })
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.visa_type_id, visaRow.id));

  return { visa: visaRow, structured: structured ?? null, snapshots };
}

// ─── render helpers ───────────────────────────────────────────────────────────

function MetaItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StringList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ul className="space-y-2">
      {arr.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-0.5 text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ol className="space-y-2">
      {arr.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function RiskList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ul className="space-y-2">
      {arr.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-0.5 text-orange-500">!</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EnglishRequirementsSection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const raw = data as Record<string, unknown>;

  // ── Subclass 500 format (ELICOS table) ────────────────────────────────────
  if (raw.test_taken_on_or_before_2025_08_06 || raw.test_taken_on_or_after_2025_08_07) {
    const eng = raw as unknown as EnglishRequirements500;

    const renderElicosTable = (tests: Record<string, TestScores>) => {
      const entries = Object.entries(tests);
      if (entries.length === 0) return null;
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4">Test</th>
                <th className="pb-2 pr-4">Standard</th>
                <th className="pb-2 pr-4">ELICOS 10 wks</th>
                <th className="pb-2">ELICOS 20 wks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(([test, scores]) => (
                <tr key={test}>
                  <td className="py-2 pr-4 font-medium">{test}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{scores.standard}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{scores.elicos_10_weeks}</td>
                  <td className="py-2 text-muted-foreground">{scores.elicos_20_weeks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {eng.test_taken_on_or_before_2025_08_06 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Tests taken on or before 6 August 2025</p>
            {renderElicosTable(eng.test_taken_on_or_before_2025_08_06)}
          </div>
        )}
        {eng.test_taken_on_or_after_2025_08_07 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Tests taken on or after 7 August 2025</p>
            {renderElicosTable(eng.test_taken_on_or_after_2025_08_07)}
          </div>
        )}
        {eng.notes && eng.notes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Notes</p>
            <ul className="space-y-1">
              {eng.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Subclass 482 format (per-skill scores) ────────────────────────────────
  const eng = raw as unknown as EnglishRequirements482;

  const META_KEYS = new Set([
    "single_sitting_required",
    "single_skill_retake_accepted",
    "single_skill_retake_note",
  ]);

  const renderPerSkillTable = (
    block: Record<string, PerSkillScores | string | boolean>,
    metaNote?: string
  ) => {
    const entries = Object.entries(block).filter(([k]) => !META_KEYS.has(k));
    if (entries.length === 0) return null;

    return (
      <div className="space-y-2">
        {metaNote && <p className="text-sm text-muted-foreground italic">{metaNote}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4">Test</th>
                <th className="pb-2 pr-4">Listening</th>
                <th className="pb-2 pr-4">Reading</th>
                <th className="pb-2 pr-4">Writing</th>
                <th className="pb-2">Speaking</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(([test, scores]) => {
                if (typeof scores !== "object" || scores === null) return null;
                const s = scores as PerSkillScores;
                return (
                  <>
                    <tr key={test}>
                      <td className="py-2 pr-4 font-medium">{test.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.listening ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.reading ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.writing ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{s.speaking ?? "—"}</td>
                    </tr>
                    {s.note && (
                      <tr key={`${test}-note`}>
                        <td colSpan={5} className="pb-2 pt-0 text-xs text-muted-foreground italic">
                          {s.note}
                        </td>
                      </tr>
                    )}
                    {s.overall !== undefined && (
                      <tr key={`${test}-overall`}>
                        <td className="pb-2 pt-0 text-xs text-muted-foreground" colSpan={5}>
                          Overall: {s.overall}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {eng.summary && <p className="text-sm text-muted-foreground">{eng.summary}</p>}

      {eng.test_validity && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Test validity: </span>{eng.test_validity}
        </p>
      )}

      {eng.passport_exemptions && eng.passport_exemptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Passport exemptions</p>
          <ul className="space-y-1">
            {eng.passport_exemptions.map((ex, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eng.exemptions && eng.exemptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Exemptions</p>
          <ul className="space-y-1">
            {eng.exemptions.map((ex, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eng.online_tests_not_accepted && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Online tests not accepted</p>
          {eng.online_tests_not_accepted.rule && (
            <p className="text-sm text-muted-foreground">{eng.online_tests_not_accepted.rule}</p>
          )}
          {eng.online_tests_not_accepted.examples_not_accepted && (
            <ul className="space-y-1">
              {eng.online_tests_not_accepted.examples_not_accepted.map((ex, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-orange-500">!</span>
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {eng.tests_taken_on_or_after_2025_09_13 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tests taken on or after 13 September 2025</p>
          {renderPerSkillTable(
            eng.tests_taken_on_or_after_2025_09_13 as Record<string, PerSkillScores | string | boolean>,
            (eng.tests_taken_on_or_after_2025_09_13 as Record<string, unknown>).single_skill_retake_note as string | undefined
          )}
        </div>
      )}

      {eng.tests_taken_on_or_after_2025_08_07 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tests taken on or after 7 August 2025</p>
          {renderPerSkillTable(
            eng.tests_taken_on_or_after_2025_08_07 as Record<string, PerSkillScores | string | boolean>,
            (eng.tests_taken_on_or_after_2025_08_07 as Record<string, unknown>).single_skill_retake_note as string | undefined
          )}
        </div>
      )}

      {eng.tests_taken_before_2025_09_13 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tests taken before 13 September 2025</p>
          {!!(eng.tests_taken_before_2025_09_13 as Record<string, unknown>).single_sitting_required && (
            <p className="text-sm text-muted-foreground italic">Must be taken in a single sitting.</p>
          )}
          {renderPerSkillTable(
            eng.tests_taken_before_2025_09_13 as Record<string, PerSkillScores | string | boolean>
          )}
        </div>
      )}

      {eng.tests_taken_on_or_before_2025_08_06 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tests taken on or before 6 August 2025</p>
          {renderPerSkillTable(
            eng.tests_taken_on_or_before_2025_08_06 as Record<string, PerSkillScores | string | boolean>,
            (eng.tests_taken_on_or_before_2025_08_06 as Record<string, unknown>).single_skill_retake_note as string | undefined
          )}
        </div>
      )}

      {eng.notes && eng.notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Notes</p>
          <ul className="space-y-1">
            {eng.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eng.labour_agreement_stream_note && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Labour Agreement stream: </span>
          {eng.labour_agreement_stream_note}
        </p>
      )}
    </div>
  );
}

function FinancialRequirementsSection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const fin = data as FinancialRequirements;
  const hasKnownFinancialData =
    fin.living_costs_12_months ||
    fin.annual_income_option ||
    fin.schooling_costs_per_child ||
    fin.travel_costs_guidance;

  if (!hasKnownFinancialData) {
    return <StructuredJsonSection data={data} />;
  }

  const KVTable = ({ rows }: { rows: Record<string, string> }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {Object.entries(rows).map(([key, value]) => (
            <tr key={key}>
              <td className="py-2 pr-4 capitalize text-muted-foreground">
                {key.replace(/_/g, " ")}
              </td>
              <td className="py-2 font-medium">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {fin.living_costs_12_months && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Living costs (per 12 months)</p>
          <KVTable rows={fin.living_costs_12_months} />
        </div>
      )}

      {fin.annual_income_option && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Annual income option</p>
          <KVTable rows={fin.annual_income_option} />
        </div>
      )}

      {fin.schooling_costs_per_child && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Schooling costs (per child, per year)</p>
          <p className="text-sm text-muted-foreground">{fin.schooling_costs_per_child}</p>
        </div>
      )}

      {fin.travel_costs_guidance && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Travel costs guidance</p>
          <KVTable rows={fin.travel_costs_guidance} />
        </div>
      )}
    </div>
  );
}

function OccupationRequirementsSection({
  data,
}: {
  data: unknown;
}) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const occ = data as Record<string, unknown>;
  const summary = occ.summary as string | undefined;
  const occupations =
    (occ.occupations as string[] | undefined) ??
    (occ.sample_occupations as string[] | undefined);
  const note = occ.note as string | undefined;
  const notes = occ.notes as string[] | undefined;
  const statesAndTerritories = occ.states_and_territories as string[] | undefined;
  const stateSpecificReviewRequired = occ.state_specific_review_required as boolean | undefined;

  return (
    <div className="space-y-4">
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      {note && <p className="text-xs italic text-muted-foreground">{note}</p>}
      {stateSpecificReviewRequired && (
        <p className="text-xs italic text-muted-foreground">State-specific review required.</p>
      )}
      {notes && notes.length > 0 && (
        <ul className="space-y-1">
          {notes.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {occupations && occupations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Eligible occupations (sample)</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {occupations.map((occ, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{occ}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {statesAndTerritories && statesAndTerritories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">States and territories</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {statesAndTerritories.map((state, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{state}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PointsTestRulesSection({
  data,
}: {
  data: unknown;
}) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const points = data as Record<string, unknown>;
  const minPoints =
    (points.minimum_points_required as number | undefined) ??
    (points.minimum_points as number | undefined);
  const summary = points.summary as string | undefined;
  const note = points.note as string | undefined;

  const renderPointsTable = (items: unknown): React.ReactNode => {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-sm">
          <tbody className="divide-y">
            {items.map((item: unknown, i: number) => {
              if (typeof item !== "object" || !item) return null;
              const row = item as Record<string, unknown>;
              const key1 = Object.keys(row)[0];
              const val1 = Object.keys(row)[1];
              if (!key1 || !val1) return null;
              return (
                <tr key={i}>
                  <td className="py-2 pr-4 text-muted-foreground">{String(row[key1])}</td>
                  <td className="py-2 font-semibold">{String(row[val1])} pts</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

      {minPoints !== undefined && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-semibold">Minimum points required: {minPoints}</p>
        </div>
      )}

      {note && <p className="text-xs italic text-muted-foreground">{note}</p>}

      {Array.isArray(points.age) && points.age.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Age</p>
          {renderPointsTable(points.age)}
        </div>
      )}

      {Array.isArray(points.english_language) && points.english_language.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">English language</p>
          {renderPointsTable(points.english_language)}
        </div>
      )}

      {Array.isArray(points.english) && points.english.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">English language</p>
          {renderPointsTable(points.english)}
        </div>
      )}

      {Array.isArray(points.overseas_skilled_employment) && points.overseas_skilled_employment.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Overseas skilled employment</p>
          {renderPointsTable(points.overseas_skilled_employment)}
        </div>
      )}

      {Array.isArray(points.australian_skilled_employment) && points.australian_skilled_employment.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Australian skilled employment</p>
          {renderPointsTable(points.australian_skilled_employment)}
        </div>
      )}

      {Array.isArray(points.education) && points.education.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Education</p>
          {renderPointsTable(points.education)}
        </div>
      )}

      {Array.isArray(points.professional_year) && points.professional_year.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Professional year</p>
          {renderPointsTable(points.professional_year)}
        </div>
      )}

      {Array.isArray(points.partner_skills) && points.partner_skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Partner skills</p>
          {renderPointsTable(points.partner_skills)}
        </div>
      )}
    </div>
  );
}

function RegionalRequirementsSection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const regional = data as Record<string, unknown>;
  const summary = regional.summary as string | undefined;
  const pathwayToPermanentResidence = regional.pathway_to_permanent_residence as string | undefined;
  const cannotApplyBefore3Years =
    regional.cannot_apply_for_certain_permanent_visas_before_3_years as string[] | undefined;

  return (
    <div className="space-y-4">
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      {pathwayToPermanentResidence && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Pathway to permanent residence: </span>
          {pathwayToPermanentResidence}
        </p>
      )}
      {cannotApplyBefore3Years && cannotApplyBefore3Years.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Cannot apply for certain permanent visas before 3 years</p>
          <ul className="space-y-1">
            {cannotApplyBefore3Years.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NominationOrSponsorshipSection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const info = data as Record<string, unknown>;
  const options = info.options as string[] | undefined;
  const sponsorRequirements = info.eligible_relative_sponsor_requirements as string[] | undefined;
  const eligibleRelatives = info.eligible_relatives as string[] | undefined;

  return (
    <div className="space-y-4">
      {options && options.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Options</p>
          <ul className="space-y-1">
            {options.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sponsorRequirements && sponsorRequirements.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Eligible relative sponsor requirements</p>
          <ul className="space-y-1">
            {sponsorRequirements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eligibleRelatives && eligibleRelatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Eligible relatives</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {eligibleRelatives.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatJsonLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function StructuredJsonSection({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return <p className="text-sm text-muted-foreground">{String(data)}</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-sm text-muted-foreground">No data available.</p>;
    }

    return (
      <ul className="space-y-2">
        {data.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 text-primary">•</span>
            <div>
              <StructuredJsonSection data={item} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <p className="text-sm font-semibold">{formatJsonLabel(key)}</p>
          <StructuredJsonSection data={value} />
        </div>
      ))}
    </div>
  );
}

function PathwaySection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const pathway = data as Record<string, unknown>;
  const stage1 = pathway.stage_1 as Record<string, unknown> | undefined;
  const stage2 = pathway.stage_2 as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      {stage1 && (
        <div className="rounded-md border border-border/70 p-3">
          <p className="text-sm font-semibold">Stage 1</p>
          <p className="text-sm text-muted-foreground">Subclass: {String(stage1.subclass ?? "-")}</p>
          <p className="text-sm text-muted-foreground">Type: {String(stage1.type ?? "-")}</p>
          {typeof stage1.description === "string" && (
            <p className="text-sm text-muted-foreground">{String(stage1.description)}</p>
          )}
        </div>
      )}
      {stage1 && stage2 && (
        <p className="text-center text-sm font-semibold text-muted-foreground">820 -&gt; 801</p>
      )}
      {stage2 && (
        <div className="rounded-md border border-border/70 p-3">
          <p className="text-sm font-semibold">Stage 2</p>
          <p className="text-sm text-muted-foreground">Subclass: {String(stage2.subclass ?? "-")}</p>
          <p className="text-sm text-muted-foreground">Type: {String(stage2.type ?? "-")}</p>
          {typeof stage2.description === "string" && (
            <p className="text-sm text-muted-foreground">{String(stage2.description)}</p>
          )}
        </div>
      )}
      {"summary" in pathway && typeof pathway.summary === "string" && (
        <p className="text-sm text-muted-foreground">{pathway.summary}</p>
      )}
      {"permanent_stage_timing_note" in pathway &&
        typeof pathway.permanent_stage_timing_note === "string" && (
          <p className="text-sm text-muted-foreground">{pathway.permanent_stage_timing_note}</p>
        )}
    </div>
  );
}

type PageProps = {
  params: Promise<{ locale: string; subclass: string }>;
};

export default async function VisaDetailsPage({ params }: PageProps) {
  const { locale, subclass } = await params;

  const result = await getVisaDetails(subclass);
  if (!result) notFound();

  const { visa, structured, snapshots } = result;
  const reviewedBadgeVariant =
    visa.reviewed_status === "approved"
      ? "default"
      : visa.reviewed_status === "needs_review"
        ? "secondary"
        : "outline";

  const sections = [
    {
      title: "Key requirements",
      content: <StringList items={structured?.key_requirements} />,
    },
    {
      title: "Documents required",
      content: <StringList items={structured?.documents_required} />,
    },
    {
      title: "Application steps",
      content: <NumberedList items={structured?.application_steps} />,
    },
    {
      title: "Visa conditions",
      content: <StringList items={structured?.visa_conditions} />,
    },
    {
      title: "Risk flags",
      content: <RiskList items={structured?.risks} />,
    },
    {
      title: "English language requirements",
      content: <EnglishRequirementsSection data={structured?.english_requirements} />,
    },
    {
      title: "Financial requirements",
      content: <FinancialRequirementsSection data={structured?.financial_requirements} />,
    },
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "occupation_requirements" in structured.raw_json
      ? [
          {
            title: "Occupation requirements",
            content: <OccupationRequirementsSection data={(structured.raw_json as Record<string, unknown>).occupation_requirements} />,
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "points_test_rules" in structured.raw_json
      ? [
          {
            title: "Points test rules",
            content: <PointsTestRulesSection data={(structured.raw_json as Record<string, unknown>).points_test_rules} />,
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "regional_requirements" in structured.raw_json
      ? [
          {
            title: "Regional requirements",
            content: (
              <RegionalRequirementsSection
                data={(structured.raw_json as Record<string, unknown>).regional_requirements}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "nomination_or_sponsorship" in structured.raw_json
      ? [
          {
            title: "Nomination or sponsorship",
            content: (
              <NominationOrSponsorshipSection
                data={(structured.raw_json as Record<string, unknown>).nomination_or_sponsorship}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "relationship_requirements" in structured.raw_json
      ? [
          {
            title: "Relationship requirements",
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).relationship_requirements}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "pathway" in structured.raw_json
      ? [
          {
            title: "Pathway",
            content: <PathwaySection data={(structured.raw_json as Record<string, unknown>).pathway} />,
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "sponsor_requirements" in structured.raw_json
      ? [
          {
            title: "Sponsor requirements",
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).sponsor_requirements}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "family_members" in structured.raw_json
      ? [
          {
            title: "Family members",
            content: (
              <StructuredJsonSection data={(structured.raw_json as Record<string, unknown>).family_members} />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "domestic_and_family_violence" in structured.raw_json
      ? [
          {
            title: "Domestic and family violence",
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).domestic_and_family_violence}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "faq_summary" in structured.raw_json
      ? [
          {
            title: "FAQ summary",
            content: <StructuredJsonSection data={(structured.raw_json as Record<string, unknown>).faq_summary} />,
          },
        ]
      : []),
  ];

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-8">

        {/* breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${locale}`} className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${locale}/checker`} className="hover:text-foreground">
            Visa Checker
          </Link>
          <span>/</span>
          <span className="text-foreground">Subclass {visa.subclass}</span>
        </nav>

        {/* header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Subclass {visa.subclass}</Badge>
            <Badge variant="secondary">{visa.category}</Badge>
            <Badge variant={reviewedBadgeVariant}>{visa.reviewed_status ?? "needs_review"}</Badge>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">{visa.visa_name}</h1>
          {visa.purpose && (
            <p className="max-w-3xl text-base text-muted-foreground">{visa.purpose}</p>
          )}
        </div>

        {/* meta grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Stay period" value={visa.stay_period} />
              <MetaItem label="Cost" value={visa.cost} />
              <MetaItem label="Work rights" value={visa.work_rights} />
              <MetaItem
                label="Last checked"
                value={
                  visa.last_checked
                    ? new Date(visa.last_checked).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : undefined
                }
              />
              {visa.source_url && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Official source
                  </p>
                  <a
                    href={visa.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {visa.source_url}
                  </a>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* structured sections */}
        <div className="space-y-4">
          {sections.map(({ title, content }) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>{content}</CardContent>
            </Card>
          ))}
        </div>

        {/* source snapshots */}
        {snapshots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {snapshots.map((snap) => {
                  const notes = snap.notes ?? "";
                  const title = /english proficiency/i.test(notes)
                    ? "English proficiency requirements"
                    : /core skills stream|main visa/i.test(notes)
                      ? "Main visa page"
                      : "PDF snapshot";
                  return (
                    <div key={snap.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">
                          Captured:{" "}
                          {snap.captured_at
                            ? new Date(snap.captured_at).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "Unknown"}
                        </p>
                      </div>
                      {snap.pdf_snapshot_url && (
                        <Button asChild variant="outline" size="sm" className="shrink-0">
                          <a
                            href={snap.pdf_snapshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* compliance notice */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex gap-4 p-5">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This page provides general information only. It does not provide migration advice or
              legal advice. For personalised advice, speak with a registered migration agent or
              Australian legal practitioner.
            </p>
          </CardContent>
        </Card>

        {/* navigation */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>Home</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/checker`}>Check your pathway</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/${locale}/agent-referral`}>Speak with a registered migration agent</Link>
          </Button>
        </div>

      </section>
    </main>
  );
}
