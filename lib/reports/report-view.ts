/**
 * The customer-facing report as DATA: a fixed list of sections of neutral blocks (lib/reports/report-blocks.ts), shared by the PDF
 * (lib/readiness/pdf-report-v2.ts) and the result page, so the two cannot drift apart. Rich information, no selection: every option is
 * presented with its sourced facts, in a fixed order that does not depend on the applicant's data. The only user-dependent placement
 * is that the visa the applicant picked as Target visa is listed first and marked "Your selected visa".
 *
 *   details  everything entered, labelled supplied / not provided
 *   points   the points table, then every single-factor and combined scenario as arithmetic
 *   visas    one block per visa (500, 485, 482, 186 Direct Entry, 186 TRT, 189, 190, 491, 820/801)
 *   states   all eight states and territories, fixed order
 *   invitations  published invitation rounds
 *   costs    the cost map and sums of published charges
 *   process  typical steps per pathway family
 *   documents  documents commonly requested and general points
 *   sources  the sources register and the advice statement
 *
 * Nothing here scores, gates, prices, ranks or recommends anything.
 */
import { isNewZealandPassport, newZealandAustraliaNote } from "@/lib/intake/passport";
import { targetVisaName, targetVisaOf, type TargetVisa } from "@/lib/readiness/target-visa";
import { resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import type { Block, ReportSection } from "./report-blocks";
import { buildCostsInfo } from "./report-costs";
import { agentStatement, buildDocumentsInfo, buildInvitationInfo, buildProcessInfo, buildSources, sourcesHeaders } from "./report-misc";
import { buildGlance } from "./report-glance";
import { buildPointsInfo } from "./report-points";
import type { StateMonitorSnapshot } from "@/lib/state-monitor/status";
import type { AdminStateData } from "@/lib/admin-data/types";
import { buildStateInfos } from "./report-states";
import { buildProfessionalSummary } from "./report-summary";
import { T, factLabel, tagsFor } from "./report-text";
import { buildVisaInfos, visaLabels } from "./report-visas";
import { reportDisclaimer } from "./report-disclaimer";
import { reportSectionTitle } from "./report-section-titles";
import { buildCanadaReportView } from "./canada/build-canada-view";
import { getResourcesSection } from "@/lib/readiness/pdf-content/resources";

export type { FactTag, RequirementStatus } from "./report-text";

/** The profile fields the view reads -- the PDF's userInputSummary and the result page's input carry the same ones. */
export type ReportViewProfile = {
  name?: string;
  occupation?: string;
  /** The occupation as entered (with its ANZSCO code); the assessing authority is resolved from it. */
  occupationRaw?: string;
  englishLevel?: string;
  mainGoal?: string;
  age?: string;
  currentCountry?: string;
  migrationGoals?: string[];
  isAustralianQualification?: boolean | null;
  /** The program(s) picked in the Assessment: Canada program slugs (lib/countries.ts countryVisaPathways.CA), comma separated; read by the Canada report only. */
  preferredPathway?: string;
};

/** Title-cases a proper-noun field ("steve" -> "Steve", "USA" stays), as the PDF does for the name on the cover. */
export function toDisplayCase(value: string): string {
  return value
    .trim()
    .split(/(\s+|[-/])/)
    .map((token) => {
      if (/^\s+$/.test(token) || token === "-" || token === "/") return token;
      if (token.length <= 3 && /[A-Z]/.test(token) && token === token.toUpperCase()) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join("");
}

/** The profile the view reads, built from a stored report's input exactly as the PDF route builds its summary. */
export function reportViewProfile(input: Partial<ReadinessInput>, fullName: string | null | undefined, locale: Locale): ReportViewProfile {
  return {
    name: fullName ? toDisplayCase(fullName) : undefined,
    occupation: input.occupation ? resolveOccupationDisplayName(input.occupation, locale) : input.occupation,
    occupationRaw: input.occupation,
    englishLevel: input.englishLevel,
    mainGoal: input.mainGoal,
    age: input.age,
    currentCountry: input.currentCountry ? toDisplayCase(input.currentCountry) : input.currentCountry,
    migrationGoals: input.migrationGoals,
    isAustralianQualification: input.qualificationAwardedInAustralia,
    preferredPathway: input.preferredPathway,
  };
}

export type ReportViewArgs = {
  report: ReadinessReport;
  locale: Locale;
  profile: ReportViewProfile;
  /** The date shown on the cover and the result page ("Last updated <date>" / the generation date). */
  dateText: string;
  /** The date the report is viewed (drives "older than 12 months" and "data checked more than 30 days ago"); default: now. */
  asOf?: Date;
  /** The page monitor's per-state status (lib/state-monitor/status.ts); drives the "data may have changed since" note. */
  stateMonitor?: StateMonitorSnapshot | null;
  /** The admin's state data (lib/admin-data) the state section is built from; the bundled seed when omitted. */
  stateData?: AdminStateData;
};

export type ReportView = {
  locale: Locale;
  targetVisa: TargetVisa;
  isNotSure: boolean;
  cover: { name: string; dateText: string; occupation: string; targetLine: string; title: string; label: string; subtitle: string; notice: string };
  sections: ReportSection[];
  disclaimer: string;
};

const table = (headers: string[], rows: string[][], widths: number[]): Block => ({ kind: "table", headers, rows, widths });

export function buildReportView(args: ReportViewArgs): ReportView {
  // Country -> content model -> shared renderer: a Canada report is built by the Canada model (lib/reports/canada), never by the
  // Australian builders below.
  if (args.report.country === "CA") return buildCanadaReportView(args);
  const { report, locale: l, profile, dateText } = args;
  const asOf = args.asOf ?? new Date();
  const tags = tagsFor(l);
  const target = targetVisaOf({ targetVisa: report.targetVisa });
  const occupationRaw = profile.occupationRaw ?? profile.occupation;

  const factList = report.suppliedFacts ?? [
    { field: "occupation", value: profile.occupation ?? null },
    { field: "age", value: profile.age ?? null },
    { field: "englishLevel", value: profile.englishLevel ?? null },
    { field: "currentCountry", value: profile.currentCountry ?? null },
  ];
  const facts = new Map(factList.map((f) => [f.field, f.value]));
  const notProvided = T(l, "Not entered", "Girilmedi", "未填写");

  const sections: ReportSection[] = [];
  const visaInfos = buildVisaInfos(report, target, facts, l);
  const stateInfos = buildStateInfos(report, occupationRaw, l, asOf, args.stateMonitor, args.stateData);

  // 1. Professional summary: what was supplied, what was not, the published areas covered, what remains to be verified (about one page).
  sections.push({
    id: "summary",
    title: reportSectionTitle("summary", l),
    blocks: buildProfessionalSummary({ report, facts, l, occupationRaw, targetVisaLine: `${T(l, "Target visa", "Hedef vize", "目标签证")}: ${targetVisaName(target, l)}`, states: stateInfos, visaCount: visaInfos.length }),
  });

  // 2. Applicant information: everything entered, labelled.
  const detailLines = factList.map((f) => `${factLabel(f.field, l)}: ${f.value ?? notProvided}  [${f.value === null ? tags.unknown : tags.supplied}]`);
  const extras: string[] = [];
  if (profile.mainGoal) extras.push(`${T(l, "Main goal", "Ana hedef", "主要目标")}: ${profile.mainGoal}  [${tags.supplied}]`);
  if (profile.migrationGoals?.length) extras.push(`${T(l, "Migration goals", "Göç hedefleri", "移民目标")}: ${profile.migrationGoals.join(", ")}  [${tags.supplied}]`);
  // A New Zealand passport on the Australian report: one fixed note (lib/intake/passport.ts); nothing else is added or assumed.
  const nzNote = isNewZealandPassport(facts.get("passportCountry")) ? [{ kind: "text" as const, text: newZealandAustraliaNote(l) }] : [];
  sections.push({
    id: "details",
    title: reportSectionTitle("details", l),
    blocks: [
      { kind: "text", text: `${T(l, "Target visa", "Hedef vize", "目标签证")}: ${targetVisaName(target, l)}  [${tags.supplied}]` },
      { kind: "lines", lines: [...detailLines, ...extras] },
      ...nzNote,
      { kind: "text", text: T(l, "Each line says whether the value was supplied by you or not entered. A value that was not entered is not assumed.", "Her satır, değerin sizin tarafınızdan girildiğini veya girilmediğini belirtir. Girilmeyen değer varsayılmaz.", "每一行都标明该值是您提供的还是未填写。未填写的值不作假设。") },
    ],
  });

  // 2b. At a glance: one row per visa in the fixed order, counts of what is entered / not entered / not collected, and the numeric figures side by side.
  const glance = buildGlance(visaInfos, l);
  sections.push({
    id: "glance",
    title: reportSectionTitle("glance", l),
    blocks: [{ kind: "text", text: glance.intro }, table(glance.headers, glance.rows, [0.27, 0.14, 0.1, 0.13, 0.36]), { kind: "text", text: glance.note }],
  });

  // 3. Points: the full table, then every scenario as arithmetic.
  const pts = buildPointsInfo(report, l);
  let pointsExamples: ReportSection | undefined;
  let stateDetail: ReportSection | undefined;
  if (pts.applicable) {
    const blocks: Block[] = [
      table([...pts.breakdownHeaders], pts.breakdown, [0.34, 0.12, 0.1, 0.44]),
      { kind: "text", text: pts.totalLine },
      table(pts.totalsHeaders, pts.totals, [0.22, 0.16, 0.16, 0.16, 0.3].slice(0, pts.totalsHeaders.length)),
    ];
    if (pts.stageNote) blocks.push({ kind: "text", text: pts.stageNote });
    sections.push({ id: "points", title: reportSectionTitle("points", l), blocks });
    // The arithmetic examples are an appendix (placed before the sources, below): not part of the points information itself.
    if (pts.singles.length || pts.combined.length) {
      const ex: Block[] = [{ kind: "text", text: T(l, "These examples show arithmetic using published points-table values only. They are not advice on any action and do not predict an outcome.", "Bu örnekler yalnızca yayımlanmış puan tablosu değerleriyle aritmetik gösterir. Herhangi bir eylem konusunda tavsiye değildir ve sonuç öngörmez.", "这些示例仅使用已公布积分表的数值进行算术演示，并非对任何行动的指引，也不预测结果。") }];
      if (pts.singles.length) ex.push({ kind: "heading", text: pts.singlesTitle }, table(pts.scenarioHeaders, pts.singles, [0.43, 0.13, 0.14, 0.15, 0.15]));
      if (pts.combined.length) ex.push({ kind: "heading", text: pts.combinedTitle }, table(pts.scenarioHeaders, pts.combined, [0.43, 0.13, 0.14, 0.15, 0.15]));
      ex.push({ kind: "text", text: pts.note });
      pointsExamples = { id: "pointsExamples", title: reportSectionTitle("pointsExamples", l), blocks: ex };
    }
  }

  // 4. Visa information: one block per visa, target first.
  const labels = visaLabels(l);
  const reqHeaders = [T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"), T(l, "What you entered", "Girdiğiniz", "您填写的内容"), T(l, "Source", "Kaynak", "来源"), T(l, "Information", "Bilgi durumu", "信息状态")];
  const figureHeaders = [T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"), T(l, "Your figure", "Sizin rakamınız", "您的数字"), T(l, "Published figure", "Yayımlanmış rakam", "已公布的数字"), T(l, "Source", "Kaynak", "来源")];
  const visaBlocks: Block[] = [
    { kind: "text", text: T(l, "Every visa is described with the same fields. The visa you selected is listed first; the others follow in a fixed order. Where a requirement has a published figure, your figure is shown next to it. For the other requirements the last column says only whether information was entered, not entered, or not collected by the form: it is never a statement that a requirement is met.", "Her vize aynı alanlarla anlatılır. Seçtiğiniz vize ilk sırada, diğerleri sabit sırayla gelir. Bir gerekliliğin yayımlanmış rakamı varsa sizin rakamınız yanında gösterilir. Diğer gerekliliklerde son sütun yalnızca bilginin girilip girilmediğini veya formda toplanmadığını söyler: bir gerekliliğin karşılandığı anlamına gelmez.", "每种签证使用相同字段介绍。您选择的签证排在最前，其余按固定顺序排列。要求有已公布数字时，您的数字显示在其旁边。其他要求的最后一列只说明信息已填写、未填写或表单未收集：它绝不表示要求已满足。") },
  ];
  for (const v of visaInfos) {
    visaBlocks.push({ kind: "heading", text: v.title, marked: v.selected ? T(l, "Your selected visa", "Seçtiğiniz vize", "您选择的签证") : undefined });
    visaBlocks.push({ kind: "kv", rows: v.overview });
    const numericRows = v.requirements.filter((r) => r.numeric);
    const otherRows = v.requirements.filter((r) => !r.numeric);
    if (numericRows.length) {
      visaBlocks.push(table(figureHeaders, numericRows.map((r) => [`${r.requirement}\n(${r.numeric!.label})`, r.numeric!.yours, r.numeric!.published, r.source]), [0.3, 0.26, 0.26, 0.18]));
    }
    if (otherRows.length) {
      visaBlocks.push(table(reqHeaders, otherRows.map((r) => [r.requirement, r.entered, r.source, r.statusLabel]), [0.3, 0.3, 0.24, 0.16]));
    }
  }
  void labels;
  sections.push({ id: "visas", title: reportSectionTitle("visas", l), blocks: visaBlocks });

  // 5. States and territories.
  {
    const states = stateInfos;
    if (states.length) {
      const blocks: Block[] = [
        { kind: "text", text: T(l, "Published information for all eight states and territories in a fixed order, as recorded in our sources. The occupation-list line matches the occupation you entered (supplied by you) against each published list. No state is left out or ordered by your details; a list entry is published information, not a nomination.", "Sekiz eyalet ve bölgenin tamamı için, kaynaklarımızda kayıtlı yayımlanmış bilgiler, sabit sırayla. Meslek listesi satırı girdiğiniz mesleği (sizin girdiğiniz) her yayımlanmış listeyle eşleştirir. Hiçbir eyalet dışarıda bırakılmaz veya bilgilerinize göre sıralanmaz; liste kaydı yayımlanmış bilgidir, bir adaylık değildir.", "按固定顺序列出八个州和领地的公开信息，依我们的资料记录。职业清单一行将您填写的职业（由您提供）与各州已公布清单比对。不遗漏任何州，也不按您的信息排序；清单收录是已公布的信息，并非提名。") },
      ];
      // One overview table first, so all eight jurisdictions can be scanned in one look.
      blocks.push(
        table(
          [T(l, "State or territory", "Eyalet veya bölge", "州或领地"), T(l, "Program status", "Program durumu", "项目状态"), T(l, "Occupation on its list (190 / 491)", "Meslek listede (190 / 491)", "职业是否在清单上（190 / 491）"), T(l, "Checked", "Kontrol tarihi", "核对日期")],
          states.map((s) => [`${s.name} (${s.code})`, s.status, s.occupationList, s.checkedLong || "—"]),
          [0.27, 0.2, 0.33, 0.2],
        ),
      );
      // Then one card per jurisdiction in the same order of fields: program status, occupation-list status, key published conditions, data checked, official source.
      // Everything after the first few conditions is in the appendix "Additional published detail" (nothing is dropped).
      for (const s of states) {
        blocks.push({ kind: "heading", text: `${s.name} (${s.code})` });
        blocks.push({
          kind: "kv",
          rows: [
            [T(l, "Program status", "Program durumu", "项目状态"), s.status],
            [T(l, "Occupation-list status (190 / 491)", "Meslek listesi durumu (190 / 491)", "职业清单情况（190 / 491）"), s.occupationList],
            [T(l, "Key published conditions", "Temel yayımlanmış koşullar", "主要已公布条件"), s.keyConditions.length ? s.keyConditions.map((c) => `• ${c}`).join("\n") : "—"],
            [T(l, "Data checked", "Veri kontrol tarihi", "数据核对日期"), s.checkedLong ? `${s.checkedLong}${s.staleNote ? `. ${s.staleNote}` : ""}` : "—"],
            [T(l, "Official source", "Resmi kaynak", "官方来源"), [s.sources || "—", s.officialUrl].filter(Boolean).join("\n")],
          ],
        });
        if (s.additionalDetail.length) blocks.push({ kind: "text", text: T(l, `${s.additionalDetail.length} further published ${s.additionalDetail.length === 1 ? "detail" : "details"} for ${s.code} are listed under “Additional published detail” after the costs and process sections.`, `${s.code} için ${s.additionalDetail.length} ek yayımlanmış ayrıntı, maliyet ve süreç bölümlerinden sonra “Ek yayımlanmış ayrıntılar” altında listelenir.`, `${s.code} 另有 ${s.additionalDetail.length} 项已公布细节，列于费用和流程部分之后的“补充已公布细节”中。`) });
      }
      sections.push({ id: "states", title: reportSectionTitle("states", l), blocks });
      const detailBlocks: Block[] = [{ kind: "text", text: T(l, "The remaining published conditions for each state and territory, as recorded in our sources with the date checked. They are published information, not a nomination or a statement about any person.", "Her eyalet ve bölge için kalan yayımlanmış koşullar, kaynaklarımızda kayıtlı şekliyle ve kontrol tarihiyle. Yayımlanmış bilgidir; bir adaylık veya herhangi bir kişi hakkında bir ifade değildir.", "各州和领地其余已公布的条件，依我们资料记录并附核对日期。属于公开信息，不是提名，也不是对任何个人的陈述。") }];
      for (const s of states) {
        if (!s.additionalDetail.length) continue;
        detailBlocks.push({ kind: "heading", text: `${s.name} (${s.code}) — ${s.checkedLong || "—"}` }, { kind: "lines", lines: s.additionalDetail.map((c) => `• ${c}`) });
      }
      if (detailBlocks.length > 1) stateDetail = { id: "stateDetail", title: reportSectionTitle("stateDetail", l), blocks: detailBlocks };
    }
  }

  // 6. Invitation history.
  // Only published, dated historical rounds are shown (never an estimate); with none recorded the section is left out.
  const inv = buildInvitationInfo(l, asOf);
  if (inv.rows.length) {
    const invBlocks: Block[] = [{ kind: "text", text: inv.intro }, table(inv.headers, inv.rows, [0.15, 0.11, 0.1, 0.12, 0.31, 0.21])];
    if (inv.ageNote) invBlocks.push({ kind: "text", text: inv.ageNote });
    invBlocks.push({ kind: "text", text: inv.stateNote }, { kind: "text", text: inv.note });
    sections.push({ id: "invitations", title: reportSectionTitle("invitations", l), blocks: invBlocks });
  }

  // 7. Costs.
  const costs = buildCostsInfo(report, occupationRaw, l, target);
  const costBlocks: Block[] = [
    { kind: "heading", text: costs.govTitle },
    table(costs.govHeaders, costs.gov, [0.26, 0.13, 0.14, 0.14, 0.14, 0.19]),
    { kind: "text", text: costs.govNote },
  ];
  if (costs.authority.length) costBlocks.push({ kind: "heading", text: costs.authorityTitle }, { kind: "text", text: costs.authorityIntro }, table(costs.authorityHeaders, costs.authority, [0.2, 0.14, 0.14, 0.12, 0.14, 0.26].slice(0, costs.authorityHeaders.length)));
  costBlocks.push({ kind: "heading", text: costs.itemsTitle }, table(costs.itemsHeaders, costs.items, [0.3, 0.25, 0.25, 0.2].slice(0, costs.itemsHeaders.length)));
  costBlocks.push({ kind: "heading", text: costs.sumsTitle }, table(costs.sumsHeaders, costs.sums, [0.3, 0.2, 0.25, 0.25].slice(0, costs.sumsHeaders.length)));
  costs.selectedTotalLines.forEach((t) => costBlocks.push({ kind: "text", text: t }));
  costs.notes.forEach((t) => costBlocks.push({ kind: "text", text: t }));
  if (costs.livingLine) costBlocks.push({ kind: "text", text: costs.livingLine });
  sections.push({ id: "costs", title: reportSectionTitle("costs", l), blocks: costBlocks });

  // 8. Typical process.
  const processBlocks: Block[] = [{ kind: "text", text: T(l, "The usual steps for each pathway family and what the sources publish about each. It is generic: it has no dates for you.", "Her yol ailesi için olağan adımlar ve kaynakların her biri hakkında yayımladıkları. Geneldir: size özel tarih içermez.", "各类路径的常见步骤及资料对每一步的公开说明。内容为通用信息，不含针对您的日期。") }];
  for (const f of buildProcessInfo(report, occupationRaw, l)) {
    processBlocks.push({ kind: "heading", text: f.title }, { kind: "text", text: f.applies }, table([T(l, "Step", "Adım", "步骤"), T(l, "Published information", "Yayımlanmış bilgi", "已公布的信息"), T(l, "Source", "Kaynak", "来源")], f.rows.map((r) => [...r]), [0.2, 0.55, 0.25]));
  }
  sections.push({ id: "process", title: reportSectionTitle("process", l), blocks: processBlocks });

  // 9. Documents and general points.
  const docs = buildDocumentsInfo(report, l);
  const docBlocks: Block[] = [];
  if (docs.rows.length) docBlocks.push(table(docs.headers, docs.rows, [0.2, 0.42, 0.18, 0.2]));
  docBlocks.push(table(docs.extraHeaders, docs.extra, [0.16, 0.62, 0.22]), { kind: "heading", text: docs.pointsTitle }, table(docs.pointsHeaders, docs.points, [0.7, 0.3]));
  sections.push({ id: "documents", title: reportSectionTitle("documents", l), blocks: docBlocks });

  // 10. Sources register and the advice statement.
  // Appendices (before the sources): the published points-table examples and the additional published state detail.
  if (pointsExamples) sections.push(pointsExamples);
  if (stateDetail) sections.push(stateDetail);
  const resources = getResourcesSection(l, "AU");
  const srcBlocks: Block[] = [table(sourcesHeaders(l), buildSources(report, occupationRaw, stateInfos, l).map((r) => [...r]), [0.58, 0.24, 0.18])];
  const links = resources.sections.flatMap((s) => s.links.map((k) => `${k.label} — ${k.url}`));
  if (links.length) srcBlocks.push({ kind: "heading", text: T(l, "Official resources", "Resmi kaynaklar", "官方资源") }, { kind: "lines", lines: links });
  srcBlocks.push({ kind: "text", text: agentStatement(l) });
  sections.push({ id: "sources", title: reportSectionTitle("sources", l), blocks: srcBlocks });

  return {
    locale: l,
    targetVisa: target,
    isNotSure: target === "not_sure",
    cover: {
      name: profile.name ?? "",
      dateText,
      occupation: profile.occupation ?? "",
      targetLine: `${T(l, "Target visa", "Hedef vize", "目标签证")}: ${targetVisaName(target, l)}`,
      title: T(l, "LogiVisa Visa Information Report", "LogiVisa Vize Bilgi Raporu", "LogiVisa 签证信息报告"),
      label: T(l, "Information report", "Bilgi raporu", "信息报告"),
      subtitle: T(l, "Personalised visa information report based on official sources", "Resmi kaynaklara dayalı kişiselleştirilmiş vize bilgi raporu", "基于官方来源的个性化签证信息报告"),
      notice: reportDisclaimer(l),
    },
    sections,
    disclaimer: reportDisclaimer(l),
  };
}
