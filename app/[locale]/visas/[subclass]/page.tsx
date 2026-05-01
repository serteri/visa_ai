import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";

import { db } from "@/db";
import { sourceSnapshots, visaStructuredData, visaTypes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localizeVisaFields, localizeVisaStructuredData } from "@/lib/visa/localized-structured-data";

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
  notes?: string[];
  status?: string;
};

function txLocale(locale: string, zh: string, tr: string, en: string) {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function getVisaDetails(subclass: string, locale: string) {
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

  const localizedVisa = localizeVisaFields(subclass, locale, visaRow);
  const localizedStructured = localizeVisaStructuredData(subclass, locale, structured ?? null);

  return { visa: localizedVisa, structured: localizedStructured, snapshots };
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

function StringList({ items, locale }: { items: unknown; locale: string }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}
      </p>
    );
  }
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

function NumberedList({ items, locale }: { items: unknown; locale: string }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}
      </p>
    );
  }
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

function KeyValueTable({ rows, locale }: { rows: Record<string, string>; locale: string }) {
  const keyLabelMap: Record<string, { tr: string; zh: string }> = {
    student: { tr: "öğrenci", zh: "学生" },
    partner: { tr: "partner", zh: "配偶" },
    child: { tr: "çocuk", zh: "子女" },
    with_family: { tr: "aile ile", zh: "含家庭" },
    without_family: { tr: "ailesiz", zh: "不含家庭" },
    outside_australia_general: { tr: "Avustralya dışı genel", zh: "澳大利亚境外一般情况" },
    applying_in_australia: { tr: "Avustralya içinde başvuru", zh: "在澳境内申请" },
    east_or_southern_africa: { tr: "Doğu/Güney Afrika", zh: "东非或南非" },
    west_africa: { tr: "Batı Afrika", zh: "西非" },
  };

  const toLabel = (key: string) => {
    const item = keyLabelMap[key];
    if (!item) return key.replace(/_/g, " ");
    if (locale === "tr") return item.tr;
    if (locale === "zh-Hans") return item.zh;
    return key.replace(/_/g, " ");
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {Object.entries(rows).map(([key, value]) => (
            <tr key={key}>
              <td className="py-2 pr-4 capitalize text-muted-foreground">
                {toLabel(key)}
              </td>
              <td className="py-2 font-medium">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskList({ items, locale }: { items: unknown; locale: string }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}
      </p>
    );
  }
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

function EnglishRequirementsSection({ data, locale }: { data: unknown; locale: string }) {
  if (!data || typeof data !== "object") {
    return (
      <p className="text-sm text-muted-foreground">
        {txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}
      </p>
    );
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
                <th className="pb-2 pr-4">{txLocale(locale, "标准", "Standart", "Standard")}</th>
                <th className="pb-2 pr-4">{txLocale(locale, "ELICOS 10 周", "ELICOS 10 hafta", "ELICOS 10 wks")}</th>
                <th className="pb-2">{txLocale(locale, "ELICOS 20 周", "ELICOS 20 hafta", "ELICOS 20 wks")}</th>
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
            <p className="text-sm font-semibold">
              {txLocale(locale, "2025年8月6日及之前参加的考试", "6 Ağustos 2025 ve öncesinde alınan sınavlar", "Tests taken on or before 6 August 2025")}
            </p>
            {renderElicosTable(eng.test_taken_on_or_before_2025_08_06)}
          </div>
        )}
        {eng.test_taken_on_or_after_2025_08_07 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              {txLocale(locale, "2025年8月7日及之后参加的考试", "7 Ağustos 2025 ve sonrasında alınan sınavlar", "Tests taken on or after 7 August 2025")}
            </p>
            {renderElicosTable(eng.test_taken_on_or_after_2025_08_07)}
          </div>
        )}
        {eng.notes && eng.notes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{txLocale(locale, "备注", "Notlar", "Notes")}</p>
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
                <th className="pb-2 pr-4">{txLocale(locale, "听力", "Dinleme", "Listening")}</th>
                <th className="pb-2 pr-4">{txLocale(locale, "阅读", "Okuma", "Reading")}</th>
                <th className="pb-2 pr-4">{txLocale(locale, "写作", "Yazma", "Writing")}</th>
                <th className="pb-2">{txLocale(locale, "口语", "Konuşma", "Speaking")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(([test, scores]) => {
                if (typeof scores !== "object" || scores === null) return null;
                const s = scores as PerSkillScores;
                return (
                  <React.Fragment key={test}>
                    <tr>
                      <td className="py-2 pr-4 font-medium">{test.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.listening ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.reading ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.writing ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{s.speaking ?? "—"}</td>
                    </tr>
                    {s.note && (
                      <tr>
                        <td colSpan={5} className="pb-2 pt-0 text-xs text-muted-foreground italic">
                          {s.note}
                        </td>
                      </tr>
                    )}
                    {s.overall !== undefined && (
                      <tr>
                        <td className="pb-2 pt-0 text-xs text-muted-foreground" colSpan={5}>
                          {txLocale(locale, "总分", "Genel puan", "Overall")}: {s.overall}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
          <span className="font-semibold">{txLocale(locale, "考试有效期", "Sınav geçerlilik süresi", "Test validity")}: </span>{eng.test_validity}
        </p>
      )}

      {eng.passport_exemptions && eng.passport_exemptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "护照豁免", "Pasaport muafiyetleri", "Passport exemptions")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "豁免", "Muafiyetler", "Exemptions")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "不接受的线上考试", "Kabul edilmeyen online sınavlar", "Online tests not accepted")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "2025年9月13日及之后参加的考试", "13 Eylül 2025 ve sonrasında alınan sınavlar", "Tests taken on or after 13 September 2025")}</p>
          {renderPerSkillTable(
            eng.tests_taken_on_or_after_2025_09_13 as Record<string, PerSkillScores | string | boolean>,
            (eng.tests_taken_on_or_after_2025_09_13 as Record<string, unknown>).single_skill_retake_note as string | undefined
          )}
        </div>
      )}

      {eng.tests_taken_on_or_after_2025_08_07 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{txLocale(locale, "2025年8月7日及之后参加的考试", "7 Ağustos 2025 ve sonrasında alınan sınavlar", "Tests taken on or after 7 August 2025")}</p>
          {renderPerSkillTable(
            eng.tests_taken_on_or_after_2025_08_07 as Record<string, PerSkillScores | string | boolean>,
            (eng.tests_taken_on_or_after_2025_08_07 as Record<string, unknown>).single_skill_retake_note as string | undefined
          )}
        </div>
      )}

      {eng.tests_taken_before_2025_09_13 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{txLocale(locale, "2025年9月13日之前参加的考试", "13 Eylül 2025 öncesinde alınan sınavlar", "Tests taken before 13 September 2025")}</p>
          {!!(eng.tests_taken_before_2025_09_13 as Record<string, unknown>).single_sitting_required && (
            <p className="text-sm text-muted-foreground italic">{txLocale(locale, "必须一次性完成考试。", "Tek oturumda alınmış olmalıdır.", "Must be taken in a single sitting.")}</p>
          )}
          {renderPerSkillTable(
            eng.tests_taken_before_2025_09_13 as Record<string, PerSkillScores | string | boolean>
          )}
        </div>
      )}

      {eng.tests_taken_on_or_before_2025_08_06 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{txLocale(locale, "2025年8月6日及之前参加的考试", "6 Ağustos 2025 ve öncesinde alınan sınavlar", "Tests taken on or before 6 August 2025")}</p>
          {renderPerSkillTable(
            eng.tests_taken_on_or_before_2025_08_06 as Record<string, PerSkillScores | string | boolean>,
            (eng.tests_taken_on_or_before_2025_08_06 as Record<string, unknown>).single_skill_retake_note as string | undefined
          )}
        </div>
      )}

      {eng.notes && eng.notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "备注", "Notlar", "Notes")}</p>
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
          <span className="font-semibold">{txLocale(locale, "劳工协议通道", "Labour Agreement akışı", "Labour Agreement stream")}: </span>
          {eng.labour_agreement_stream_note}
        </p>
      )}
    </div>
  );
}

function FinancialRequirementsSection({ data, locale }: { data: unknown; locale: string }) {
  if (!data || typeof data !== "object") {
    return (
      <p className="text-sm text-muted-foreground">
        {txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}
      </p>
    );
  }

  const fin = data as FinancialRequirements;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {fin.living_costs_12_months && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "生活费用（12个月）", "Yaşam maliyetleri (12 ay)", "Living costs (per 12 months)")}</p>
          <KeyValueTable rows={fin.living_costs_12_months} locale={locale} />
        </div>
      )}

      {fin.annual_income_option && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "年收入选项", "Yıllık gelir seçeneği", "Annual income option")}</p>
          <KeyValueTable rows={fin.annual_income_option} locale={locale} />
        </div>
      )}

      {fin.schooling_costs_per_child && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "教育费用（每名子女/每年）", "Okul giderleri (çocuk başına/yıl)", "Schooling costs (per child, per year)")}</p>
          <p className="text-sm text-muted-foreground">{fin.schooling_costs_per_child}</p>
        </div>
      )}

      {fin.travel_costs_guidance && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "旅行费用参考", "Seyahat maliyeti rehberi", "Travel costs guidance")}</p>
          <KeyValueTable rows={fin.travel_costs_guidance} locale={locale} />
        </div>
      )}

      {fin.notes && fin.notes.length > 0 && (
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-semibold">{txLocale(locale, "备注", "Notlar", "Notes")}</p>
          <ul className="space-y-1">
            {fin.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fin.status && (
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-semibold">{txLocale(locale, "状态", "Durum", "Status")}</p>
          <p className="text-sm text-muted-foreground">{fin.status.replace(/_/g, " ")}</p>
        </div>
      )}
    </div>
  );
}

function OccupationRequirementsSection({
  data,
  locale = "en",
}: {
  data: unknown;
  locale?: string;
}) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
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
        <p className="text-xs italic text-muted-foreground">{txLocale(locale, "需要州级审核。", "Eyalet bazlı inceleme gereklidir.", "State-specific review required.")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "职业示例", "Örnek meslekler", "Listed occupations (sample)")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "州和领地", "Eyalet ve bölgeler", "States and territories")}</p>
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
  locale = "en",
}: {
  data: unknown;
  locale?: string;
}) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
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
          <p className="text-sm font-semibold">{txLocale(locale, "最低所需分数", "Gereken minimum puan", "Minimum points required")}: {minPoints}</p>
        </div>
      )}

      {note && <p className="text-xs italic text-muted-foreground">{note}</p>}

      {Array.isArray(points.age) && points.age.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "年龄", "Yaş", "Age")}</p>
          {renderPointsTable(points.age)}
        </div>
      )}

      {Array.isArray(points.english_language) && points.english_language.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "英语水平", "İngilizce seviyesi", "English language")}</p>
          {renderPointsTable(points.english_language)}
        </div>
      )}

      {Array.isArray(points.english) && points.english.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "英语水平", "İngilizce seviyesi", "English language")}</p>
          {renderPointsTable(points.english)}
        </div>
      )}

      {Array.isArray(points.overseas_skilled_employment) && points.overseas_skilled_employment.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "海外技术工作经验", "Yurt dışı nitelikli istihdam", "Overseas skilled employment")}</p>
          {renderPointsTable(points.overseas_skilled_employment)}
        </div>
      )}

      {Array.isArray(points.australian_skilled_employment) && points.australian_skilled_employment.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "澳大利亚技术工作经验", "Avustralya nitelikli istihdamı", "Australian skilled employment")}</p>
          {renderPointsTable(points.australian_skilled_employment)}
        </div>
      )}

      {Array.isArray(points.education) && points.education.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "学历", "Eğitim", "Education")}</p>
          {renderPointsTable(points.education)}
        </div>
      )}

      {Array.isArray(points.professional_year) && points.professional_year.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "专业年", "Profesyonel yıl", "Professional year")}</p>
          {renderPointsTable(points.professional_year)}
        </div>
      )}

      {Array.isArray(points.partner_skills) && points.partner_skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "配偶技能", "Eş becerileri", "Partner skills")}</p>
          {renderPointsTable(points.partner_skills)}
        </div>
      )}
    </div>
  );
}

function RegionalRequirementsSection({ data, locale = "en" }: { data: unknown; locale?: string }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
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
          <span className="font-semibold text-foreground">{txLocale(locale, "永久居留路径：", "Kalıcı oturuma geçiş: ", "Pathway to permanent residence: ")}</span>
          {pathwayToPermanentResidence}
        </p>
      )}
      {cannotApplyBefore3Years && cannotApplyBefore3Years.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "3年内不可申请的部分永久签证", "3 yıl içinde başvurulamayacak kalıcı vizeler", "Cannot apply for certain permanent visas before 3 years")}</p>
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

function NominationOrSponsorshipSection({ data, locale = "en" }: { data: unknown; locale?: string }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
  }

  const info = data as Record<string, unknown>;
  const options = info.options as string[] | undefined;
  const sponsorRequirements = info.eligible_relative_sponsor_requirements as string[] | undefined;
  const eligibleRelatives = info.eligible_relatives as string[] | undefined;

  return (
    <div className="space-y-4">
      {options && options.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{txLocale(locale, "选项", "Seçenekler", "Options")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "亲属担保要求", "Akraba sponsor şartları", "Relative sponsor requirements")}</p>
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
          <p className="text-sm font-semibold">{txLocale(locale, "符合条件的亲属", "Uygun akrabalar", "Relative categories")}</p>
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

const JSON_KEY_TRANSLATIONS: Record<string, { tr: string; zh: string }> = {
  note: { tr: "Not", zh: "备注" },
  notes: { tr: "Notlar", zh: "备注" },
  summary: { tr: "Özet", zh: "摘要" },
  description: { tr: "Açıklama", zh: "说明" },
  status: { tr: "Durum", zh: "状态" },
  default: { tr: "Varsayılan", zh: "默认值" },
  exceptions: { tr: "İstisnalar", zh: "例外情况" },
  options: { tr: "Seçenekler", zh: "选项" },
  type: { tr: "Tür", zh: "类型" },
  subclass: { tr: "Alt sınıf", zh: "子类" },
  requirement: { tr: "Şart", zh: "要求" },
  age_limit: { tr: "Yaş sınırı", zh: "年龄限制" },
  location_requirement: { tr: "Konum şartı", zh: "地点要求" },
  must_be_in_australia: { tr: "Avustralya'da olması gerekir", zh: "必须在澳大利亚境内" },
  student_visa_requirement: { tr: "Öğrenci vizesi şartı", zh: "学生签证要求" },
  police_check_required: { tr: "Polis belgesi gerekli", zh: "需要无犯罪证明" },
  health_insurance_required: { tr: "Sağlık sigortası gerekli", zh: "需要健康保险" },
  qualification_requirement: { tr: "Nitelik şartı", zh: "学历要求" },
  qualification_levels: { tr: "Nitelik seviyeleri", zh: "学历等级" },
  minimum_age_note: { tr: "Asgari yaş notu", zh: "最低年龄说明" },
  stage_1: { tr: "1. Aşama", zh: "第一阶段" },
  stage_2: { tr: "2. Aşama", zh: "第二阶段" },
  stage_3: { tr: "3. Aşama", zh: "第三阶段" },
  progression_note: { tr: "İlerleme notu", zh: "进程说明" },
  permanent_stage_timing_note: { tr: "Kalıcı aşama zamanlama notu", zh: "永久阶段时间说明" },
  spouse: { tr: "Eş", zh: "配偶" },
  de_facto: { tr: "Fiili partner", zh: "事实伴侣" },
  evidence_categories: { tr: "Kanıt kategorileri", zh: "证据类别" },
  financial: { tr: "Mali", zh: "经济" },
  household: { tr: "Ev", zh: "家庭" },
  social: { tr: "Sosyal", zh: "社交" },
  commitment: { tr: "Taahhüt", zh: "承诺" },
  usual_minimum_duration: { tr: "Olağan asgari süre", zh: "通常最短期限" },
  relationship_history_statement_should_cover: { tr: "İlişki geçmişi beyanı kapsamalıdır", zh: "关系历史陈述应涵盖" },
  sample_occupations: { tr: "Örnek meslekler", zh: "职业示例" },
  states_and_territories: { tr: "Eyalet ve bölgeler", zh: "州和领地" },
  state_specific_review_required: { tr: "Eyalet bazlı inceleme gereklidir", zh: "需要州级审核" },
  minimum_points_required: { tr: "Gereken minimum puan", zh: "最低所需分数" },
  minimum_points: { tr: "Minimum puan", zh: "最低分数" },
  pathway_to_permanent_residence: { tr: "Kalıcı oturuma geçiş", zh: "永久居留路径" },
  cannot_apply_for_certain_permanent_visas_before_3_years: { tr: "3 yıl içinde belirli kalıcı vizelere başvurulamaz", zh: "3年内不可申请部分永久签证" },
  eligible_relative_sponsor_requirements: { tr: "Uygun akraba sponsor şartları", zh: "符合条件的亲属担保要求" },
  eligible_relatives: { tr: "Uygun akrabalar", zh: "符合条件的亲属" },
  who_can_sponsor: { tr: "Kim sponsor olabilir", zh: "谁可以担保" },
  can_include_family: { tr: "Aile üyeleri dahil edilebilir", zh: "可以包含家庭成员" },
  rights_and_benefits: { tr: "Haklar ve faydalar", zh: "权利与福利" },
  relationship_evidence: { tr: "İlişki kanıtı", zh: "关系证明" },
  sponsor_statutory_declaration_should_cover: { tr: "Sponsor beyanı kapsamalıdır", zh: "担保人法定声明应涵盖" },
  obligations: { tr: "Yükümlülükler", zh: "义务" },
  withdrawal_note: { tr: "Geri çekilme notu", zh: "撤回说明" },
  dependent_child_445_pathway: { tr: "Bağımlı çocuk 445 yolu", zh: "受抚养子女445路径" },
  cannot_add_after_grant: { tr: "Onaydan sonra eklenemez", zh: "获批后不可添加" },
  family_members: { tr: "Aile üyeleri", zh: "家庭成员" },
  processing_time_note: { tr: "İşlem süresi notu", zh: "处理时间说明" },
  key_requirements: { tr: "Temel gereksinimler", zh: "关键要求" },
  documents_required: { tr: "Gerekli belgeler", zh: "所需文件" },
  application_steps: { tr: "Başvuru adımları", zh: "申请步骤" },
  visa_conditions: { tr: "Vize koşulları", zh: "签证条件" },
  risks: { tr: "Riskler", zh: "风险" },
  stage: { tr: "Aşama", zh: "阶段" },
  stay_period: { tr: "Kalış süresi", zh: "停留期限" },
  cost: { tr: "Ücret", zh: "费用" },
  visa_name: { tr: "Vize adı", zh: "签证名称" },
  relationship_requirements: { tr: "İlişki gereksinimleri", zh: "关系要求" },
  sponsor_requirements: { tr: "Sponsor gereksinimleri", zh: "担保人要求" },
  sponsor_801_requirements: { tr: "Sponsor 801 gereksinimleri", zh: "801 阶段担保人要求" },
  permanent_stage_801: { tr: "Kalıcı aşama 801", zh: "永久阶段 801" },
  domestic_and_family_violence: { tr: "Aile içi şiddet", zh: "家庭暴力" },
  faq_summary: { tr: "SSS özeti", zh: "常见问题摘要" },
  nomination_or_sponsorship: { tr: "Adaylık veya sponsorluk", zh: "提名或担保" },
  regional_requirements: { tr: "Bölgesel gereksinimler", zh: "地区要求" },
  required_level: { tr: "Gerekli seviye", zh: "要求水平" },
  sponsor_age: { tr: "Sponsor yaşı", zh: "担保人年龄" },
  sponsor_risks: { tr: "Sponsor riskleri", zh: "担保人风险" },
  sponsor_documents: { tr: "Sponsor belgeleri", zh: "担保人文件" },
  sponsor_obligations: { tr: "Sponsor yükümlülükleri", zh: "担保人义务" },
  sponsorship_duration: { tr: "Sponsorluk süresi", zh: "担保期限" },
  can_include_dependent_child: { tr: "Bağımlı çocuk dahil edilebilir", zh: "可包含受抚养子女" },
  online_application: { tr: "Çevrimiçi başvuru", zh: "在线申请" },
  progress_updates: { tr: "İlerleme güncellemeleri", zh: "进度更新" },
  urgent_processing: { tr: "Acil işlem", zh: "紧急处理" },
  health_exams: { tr: "Sağlık muayeneleri", zh: "体检" },
  review_rights: { tr: "İnceleme hakları", zh: "复审权利" },
  permanent_stage_documents: { tr: "Kalıcı aşama belgeleri", zh: "永久阶段文件" },
};

function translateJsonKey(key: string, locale: string): string {
  const t = JSON_KEY_TRANSLATIONS[key];
  if (t) {
    if (locale === "tr") return t.tr;
    if (locale === "zh-Hans") return t.zh;
  }
  return formatJsonLabel(key);
}

function StructuredJsonSection({ data, locale = "en" }: { data: unknown; locale?: string }) {
  if (data === null || data === undefined) {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
  }

  if (typeof data === "boolean") {
    return <p className="text-sm text-muted-foreground">{data ? txLocale(locale, "是", "Evet", "Yes") : txLocale(locale, "否", "Hayır", "No")}</p>;
  }

  if (typeof data === "string" || typeof data === "number") {
    return <p className="text-sm text-muted-foreground">{String(data)}</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
    }

    return (
      <ul className="space-y-2">
        {data.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 text-primary">•</span>
            <div>
              <StructuredJsonSection data={item} locale={locale} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
  }

  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <p className="text-sm font-semibold">{translateJsonKey(key, locale)}</p>
          <StructuredJsonSection data={value} locale={locale} />
        </div>
      ))}
    </div>
  );
}

function omitStructuredKeys(
  data: unknown,
  keysToOmit: string[]
): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(
      ([key]) => !keysToOmit.includes(key)
    )
  );
}

function PathwaySection({ data, locale = "en" }: { data: unknown; locale?: string }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">{txLocale(locale, "暂无数据。", "Veri mevcut değil.", "No data available.")}</p>;
  }

  const pathway = data as Record<string, unknown>;

  const renderStageBox = (label: string, stage: unknown) => {
    if (!stage) return null;
    if (typeof stage === "string") {
      return (
        <div className="rounded-md border border-border/70 p-3">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground">{stage}</p>
        </div>
      );
    }
    const s = stage as Record<string, unknown>;
    const subclassStr = s.subclass != null ? String(s.subclass) : null;
    const typeStr = s.type != null ? String(s.type) : null;
    return (
      <div className="rounded-md border border-border/70 p-3">
        <p className="text-sm font-semibold">{label}</p>
        {subclassStr && (
          <p className="text-sm text-muted-foreground">{txLocale(locale, "子类：", "Alt sınıf: ", "Subclass: ")}{subclassStr}</p>
        )}
        {typeStr && (
          <p className="text-sm text-muted-foreground">{txLocale(locale, "类型：", "Tür: ", "Type: ")}{typeStr}</p>
        )}
        {typeof s.description === "string" && (
          <p className="text-sm text-muted-foreground">{s.description}</p>
        )}
      </div>
    );
  };

  const stageLabels = [
    txLocale(locale, "第一阶段", "1. Aşama", "Stage 1"),
    txLocale(locale, "第二阶段", "2. Aşama", "Stage 2"),
    txLocale(locale, "第三阶段", "3. Aşama", "Stage 3"),
  ];

  const rawStages: Array<{ label: string; stageData: unknown } | null> = [
    pathway.stage_1 != null ? { label: stageLabels[0], stageData: pathway.stage_1 } : null,
    pathway.stage_2 != null ? { label: stageLabels[1], stageData: pathway.stage_2 } : null,
    pathway.stage_3 != null ? { label: stageLabels[2], stageData: pathway.stage_3 } : null,
  ];
  const stageEntries = rawStages.filter(
    (e): e is { label: string; stageData: unknown } => e !== null
  );

  return (
    <div className="space-y-4">
      {stageEntries.map((entry, i) => (
        <div key={i} className="space-y-4">
          {renderStageBox(entry.label, entry.stageData)}
          {i < stageEntries.length - 1 && (
            <p className="text-center text-sm font-semibold text-muted-foreground">{"→"}</p>
          )}
        </div>
      ))}
      {"summary" in pathway && typeof pathway.summary === "string" && (
        <p className="text-sm text-muted-foreground">{pathway.summary}</p>
      )}
      {"progression_note" in pathway && typeof pathway.progression_note === "string" && (
        <p className="text-xs italic text-muted-foreground">{pathway.progression_note}</p>
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
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (zh: string, tr: string, en: string) => (isTr ? tr : isZh ? zh : en);

  const result = await getVisaDetails(subclass, locale);
  if (!result) notFound();

  const { visa, structured, snapshots } = result;
  const reviewedBadgeVariant =
    visa.reviewed_status === "approved"
      ? "default"
      : visa.reviewed_status === "needs_review"
        ? "secondary"
        : "outline";
  const reviewedBadgeLabel =
    visa.reviewed_status === "approved"
      ? tx("已审核", "İncelendi", "reviewed")
      : visa.reviewed_status === "needs_review"
        ? tx("需要审核", "İnceleme gerekli", "needs review")
        : visa.reviewed_status
          ? visa.reviewed_status.replace(/_/g, " ")
          : tx("需要审核", "İnceleme gerekli", "needs review");

  const sections = [
    {
      title: tx("\u5173\u952e\u8981\u6c42", "Temel gereksinimler", "Key requirements"),
      content: <StringList items={structured?.key_requirements} locale={locale} />,
    },
    {
      title: tx("\u6240\u9700\u6587\u4ef6", "Gerekli belgeler", "Documents required"),
      content: <StringList items={structured?.documents_required} locale={locale} />,
    },
    {
      title: tx("\u7533\u8bf7\u6b65\u9aa4", "Ba\u015fvuru ad\u0131mlar\u0131", "Application steps"),
      content: <NumberedList items={structured?.application_steps} locale={locale} />,
    },
    {
      title: tx("\u7b7e\u8bc1\u6761\u4ef6", "Vize ko\u015fullar\u0131", "Visa conditions"),
      content: <StringList items={structured?.visa_conditions} locale={locale} />,
    },
    {
      title: tx("\u98ce\u9669\u6807\u8bc6", "Risk bayraklar\u0131", "Risk flags"),
      content: <RiskList items={structured?.risks} locale={locale} />,
    },
    {
      title: tx("\u82f1\u8bed\u8981\u6c42", "\u0130ngilizce dil gereksinimleri", "English language requirements"),
      content: <EnglishRequirementsSection data={structured?.english_requirements} locale={locale} />,
    },
    {
      title: tx("\u8d22\u52a1\u8981\u6c42", "Mali gereksinimler", "Financial requirements"),
      content: <FinancialRequirementsSection data={structured?.financial_requirements} locale={locale} />,
    },
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "eligibility" in structured.raw_json
      ? [
          {
            title: tx("\u8d44\u683c\u6761\u4ef6", "Uygunluk", "Eligibility"),
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).eligibility}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "occupation_requirements" in structured.raw_json
      ? [
          {
            title: tx("\u804c\u4e1a\u8981\u6c42", "Meslek gereksinimleri", "Occupation requirements"),
            content: <OccupationRequirementsSection data={(structured.raw_json as Record<string, unknown>).occupation_requirements} locale={locale} />,
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "points_test_rules" in structured.raw_json
      ? [
          {
            title: tx("\u79ef\u5206\u6d4b\u8bd5\u89c4\u5219", "Puan testi kurallar\u0131", "Points test rules"),
            content: <PointsTestRulesSection data={(structured.raw_json as Record<string, unknown>).points_test_rules} locale={locale} />,
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "regional_requirements" in structured.raw_json
      ? [
          {
            title: tx("\u5730\u533a\u8981\u6c42", "B\u00f6lgsel gereksinimler", "Regional requirements"),
            content: (
              <RegionalRequirementsSection
                data={(structured.raw_json as Record<string, unknown>).regional_requirements}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "nomination_or_sponsorship" in structured.raw_json
      ? [
          {
            title: tx("\u63d0\u540d\u6216\u62c5\u4fdd", "Adayl\u0131k veya sponsorluk", "Nomination or sponsorship"),
            content: (
              <NominationOrSponsorshipSection
                data={(structured.raw_json as Record<string, unknown>).nomination_or_sponsorship}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "relationship_requirements" in structured.raw_json
      ? [
          {
            title: tx("\u5173\u7cfb\u8981\u6c42", "\u0130li\u015fki gereksinimleri", "Relationship requirements"),
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).relationship_requirements}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "pathway" in structured.raw_json
      ? [
          {
            title: tx("\u8def\u5f84", "Yol", "Pathway"),
            content: <PathwaySection data={(structured.raw_json as Record<string, unknown>).pathway} locale={locale} />,
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "permanent_stage_801" in structured.raw_json
      ? [
          {
            title: tx("\u6c38\u5c45\u9636\u6bb5 801", "Kal\u0131c\u0131 a\u015fama 801", "Permanent stage 801"),
            content: (
              <StructuredJsonSection
                data={omitStructuredKeys(
                  (structured.raw_json as Record<string, unknown>).permanent_stage_801,
                  ["sponsor_801_requirements"]
                )}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "sponsor_requirements" in structured.raw_json
      ? [
          {
            title: tx("\u62c5\u4fdd\u4eba\u8981\u6c42", "Sponsor gereksinimleri", "Sponsor requirements"),
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).sponsor_requirements}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json &&
    typeof structured.raw_json === "object" &&
    "permanent_stage_801" in structured.raw_json &&
    typeof (structured.raw_json as Record<string, unknown>).permanent_stage_801 === "object" &&
    (structured.raw_json as { permanent_stage_801?: Record<string, unknown> }).permanent_stage_801
      ?.sponsor_801_requirements
      ? [
          {
            title: tx("801 \u62c5\u4fdd\u4eba\u8981\u6c42", "Sponsor 801 gereksinimleri", "Sponsor 801 requirements"),
            content: (
              <StructuredJsonSection
                data={
                  (structured.raw_json as { permanent_stage_801?: Record<string, unknown> })
                    .permanent_stage_801?.sponsor_801_requirements
                }
              locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "family_members" in structured.raw_json
      ? [
          {
            title: tx("\u5bb6\u5ead\u6210\u5458", "Aile \u00fcyeleri", "Family members"),
            content: (
              <StructuredJsonSection data={(structured.raw_json as Record<string, unknown>).family_members} locale={locale} />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "domestic_and_family_violence" in structured.raw_json
      ? [
          {
            title: tx("\u5bb6\u5ead\u66b4\u529b", "Aile i\u00e7i \u015fiddet", "Domestic and family violence"),
            content: (
              <StructuredJsonSection
                data={(structured.raw_json as Record<string, unknown>).domestic_and_family_violence}
                locale={locale}
              />
            ),
          },
        ]
      : []),
    ...(structured?.raw_json && typeof structured.raw_json === "object" && "faq_summary" in structured.raw_json
      ? [
          {
            title: tx("\u5e38\u89c1\u95ee\u9898\u6458\u8981", "SSS \u00f6zeti", "FAQ summary"),
            content: <StructuredJsonSection data={(structured.raw_json as Record<string, unknown>).faq_summary} locale={locale} />,
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
            {tx("主页", "Ana sayfa", "Home")}
          </Link>
          <span>/</span>
          <Link href={`/${locale}/checker`} className="hover:text-foreground">
            {tx("签证评估", "Vize Denetleyici", "Visa Checker")}
          </Link>
          <span>/</span>
          <span className="text-foreground">Subclass {visa.subclass}</span>
        </nav>

        {/* header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Subclass {visa.subclass}</Badge>
            <Badge variant="secondary">{visa.category}</Badge>
            <Badge variant={reviewedBadgeVariant}>{reviewedBadgeLabel}</Badge>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">{visa.visa_name}</h1>
          {visa.purpose && (
            <p className="max-w-3xl text-base text-muted-foreground">{visa.purpose}</p>
          )}
        </div>

        {/* meta grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tx("概览", "Genel Bakış", "Overview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label={tx("停留期限", "Kalış süresi", "Stay period")} value={visa.stay_period} />
              <MetaItem label={tx("费用", "Ücret", "Cost")} value={visa.cost} />
              <MetaItem label={tx("工作权利", "Çalışma hakkı", "Work rights")} value={visa.work_rights} />
              <MetaItem
                label={tx("最近更新", "Son kontrol", "Last checked")}
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
                    {tx("官方来源", "Resmi kaynak", "Official source")}
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
              <CardTitle className="text-base">{tx("来源快照", "Kaynak anlık görüntüleri", "Source snapshots")}</CardTitle>
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
              {tx(
                "本页仅提供一般信息，不提供移民建议或法律建议。如需个人化建议，请和注册移民顾问或澳大利亚法律从业者联系。",
                "Bu sayfa yalnızca genel bilgi sunmaktadır. Göç veya hukuki tavsiye vermez. Kişisel tavsiye için kayıtlı bir göç danışmanı ile görüşün.",
                "This page provides general information only. It does not provide migration advice or legal advice. For personalised advice, speak with a registered migration agent or Australian legal practitioner."
              )}
            </p>
          </CardContent>
        </Card>

        {/* navigation */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>{tx("主页", "Ana sayfa", "Home")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/checker`}>{tx("检查您的路径", "Yolunuzu kontrol edin", "Check your pathway")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/${locale}/agent-referral`}>{tx("和注册移民顾问交流", "Kayıtlı bir göç danışmanıyla konuşun", "Speak with a registered migration agent")}</Link>
          </Button>
        </div>

      </section>
    </main>
  );
}
