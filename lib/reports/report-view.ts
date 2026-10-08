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
import { targetVisaName, targetVisaOf, type TargetVisa } from "@/lib/readiness/target-visa";
import { resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import type { Block, ReportSection } from "./report-blocks";
import { buildCostsInfo } from "./report-costs";
import { agentStatement, buildDocumentsInfo, buildInvitationInfo, buildProcessInfo, buildSources, sourcesHeaders } from "./report-misc";
import { buildPointsInfo } from "./report-points";
import { buildStateInfos } from "./report-states";
import { T, factLabel, tagsFor } from "./report-text";
import { buildVisaInfos, visaLabels } from "./report-visas";
import { reportDisclaimer } from "./report-disclaimer";
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
};

/** Title-cases a proper-noun field ("steve" -> "Steve", "USA" stays), as the PDF does for the name on the cover. */
function toDisplayCase(value: string): string {
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
  };
}

export type ReportViewArgs = {
  report: ReadinessReport;
  locale: Locale;
  profile: ReportViewProfile;
  /** The date shown on the cover and the result page ("Last updated <date>" / the generation date). */
  dateText: string;
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
  const { report, locale: l, profile, dateText } = args;
  const tags = tagsFor(l);
  const target = targetVisaOf({ targetVisa: report.targetVisa });
  const occupationRaw = profile.occupationRaw ?? profile.occupation;
  const isCA = report.country === "CA";

  const factList = report.suppliedFacts ?? [
    { field: "occupation", value: profile.occupation ?? null },
    { field: "age", value: profile.age ?? null },
    { field: "englishLevel", value: profile.englishLevel ?? null },
    { field: "currentCountry", value: profile.currentCountry ?? null },
  ];
  const facts = new Map(factList.map((f) => [f.field, f.value]));
  const notProvided = T(l, "Not provided", "Girilmedi", "未提供");

  const sections: ReportSection[] = [];

  // 2. Your details: everything entered, labelled.
  const detailLines = factList.map((f) => `${factLabel(f.field, l)}: ${f.value ?? notProvided}  [${f.value === null ? tags.unknown : tags.supplied}]`);
  const extras: string[] = [];
  if (profile.mainGoal) extras.push(`${T(l, "Main goal", "Ana hedef", "主要目标")}: ${profile.mainGoal}  [${tags.supplied}]`);
  if (profile.migrationGoals?.length) extras.push(`${T(l, "Migration goals", "Göç hedefleri", "移民目标")}: ${profile.migrationGoals.join(", ")}  [${tags.supplied}]`);
  sections.push({
    id: "details",
    title: T(l, "Your details", "Bilgileriniz", "您的信息"),
    blocks: [
      { kind: "text", text: `${T(l, "Target visa", "Hedef vize", "目标签证")}: ${targetVisaName(target, l)}  [${tags.supplied}]` },
      { kind: "lines", lines: [...detailLines, ...extras] },
      { kind: "text", text: T(l, "Each line says whether the value was supplied by you or not provided. A value that was not provided is not assumed.", "Her satır, değerin sizin tarafınızdan girildiğini veya girilmediğini belirtir. Girilmeyen değer varsayılmaz.", "每一行都标明该值是您提供的还是未提供。未提供的值不作假设。") },
    ],
  });

  // 3. Points: the full table, then every scenario as arithmetic.
  const pts = buildPointsInfo(report, l);
  if (!isCA && pts.applicable) {
    const blocks: Block[] = [
      table([...pts.breakdownHeaders], pts.breakdown, [0.34, 0.12, 0.1, 0.44]),
      { kind: "text", text: pts.totalLine },
      table(pts.totalsHeaders, pts.totals, [0.22, 0.16, 0.16, 0.16, 0.3].slice(0, pts.totalsHeaders.length)),
    ];
    if (pts.stageNote) blocks.push({ kind: "text", text: pts.stageNote });
    if (pts.singles.length) blocks.push({ kind: "heading", text: pts.singlesTitle }, table(pts.scenarioHeaders, pts.singles, [0.43, 0.13, 0.14, 0.15, 0.15]));
    if (pts.combined.length) blocks.push({ kind: "heading", text: pts.combinedTitle }, table(pts.scenarioHeaders, pts.combined, [0.43, 0.13, 0.14, 0.15, 0.15]));
    blocks.push({ kind: "text", text: pts.note });
    sections.push({ id: "points", title: T(l, "Points", "Puanlar", "积分"), blocks });
  }

  // 4. Visa information: one block per visa, target first.
  const labels = visaLabels(l);
  const reqHeaders = [T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"), T(l, "What you entered", "Girdiğiniz", "您填写的内容"), T(l, "Source", "Kaynak", "来源"), T(l, "Status", "Durum", "状态")];
  const visaBlocks: Block[] = [
    { kind: "text", text: T(l, "Every visa is described with the same fields. The visa you selected is listed first; the others follow in a fixed order. Status describes the information, not an outcome: provided / not provided / cannot determine / not applicable.", "Her vize aynı alanlarla anlatılır. Seçtiğiniz vize ilk sırada, diğerleri sabit sırayla gelir. Durum sonucu değil bilgiyi anlatır: girildi / girilmedi / belirlenemiyor / geçerli değil.", "每种签证使用相同字段介绍。您选择的签证排在最前，其余按固定顺序排列。状态描述的是信息而非结果：已提供 / 未提供 / 无法判断 / 不适用。") },
  ];
  for (const v of buildVisaInfos(report, target, facts, l)) {
    visaBlocks.push({ kind: "heading", text: v.title, marked: v.selected ? T(l, "Your selected visa", "Seçtiğiniz vize", "您选择的签证") : undefined });
    visaBlocks.push({ kind: "kv", rows: v.overview });
    if (v.requirements.length) {
      visaBlocks.push(table(reqHeaders, v.requirements.map((r) => [r.requirement, r.entered, r.source, r.statusLabel]), [0.3, 0.3, 0.24, 0.16]));
    }
  }
  void labels;
  sections.push({ id: "visas", title: T(l, "Visa information", "Vize bilgileri", "签证信息"), blocks: visaBlocks });

  // 5. States and territories.
  if (!isCA) {
    const states = buildStateInfos(report, occupationRaw, l);
    if (states.length) {
      const blocks: Block[] = [
        { kind: "text", text: T(l, "Published information for all eight states and territories in a fixed order, as recorded in our sources. The occupation-list line matches the occupation you entered (supplied by you) against each published list. No state is left out or ordered by your details; a list entry is published information, not a nomination.", "Sekiz eyalet ve bölgenin tamamı için, kaynaklarımızda kayıtlı yayımlanmış bilgiler, sabit sırayla. Meslek listesi satırı girdiğiniz mesleği (sizin girdiğiniz) her yayımlanmış listeyle eşleştirir. Hiçbir eyalet dışarıda bırakılmaz veya bilgilerinize göre sıralanmaz; liste kaydı yayımlanmış bilgidir, bir adaylık değildir.", "按固定顺序列出八个州和领地的公开信息，依我们的资料记录。职业清单一行将您填写的职业（由您提供）与各州已公布清单比对。不遗漏任何州，也不按您的信息排序；清单收录是已公布的信息，并非提名。") },
      ];
      for (const s of states) {
        blocks.push({ kind: "heading", text: `${s.name} (${s.code})` });
        blocks.push({
          kind: "kv",
          rows: [
            [T(l, "Program status in our sources", "Kaynaklarımızdaki program durumu", "资料中的项目状态"), s.status],
            [T(l, "Occupation on its list (190 / 491)", "Meslek listede (190 / 491)", "职业是否在清单上（190 / 491）"), s.occupationList],
            ...(s.conditions.length ? s.conditions : ["—"]).map((c, i): [string, string] => [i === 0 ? T(l, "Published conditions", "Yayımlanmış koşullar", "已公布的条件") : " ", c]),
            [T(l, "Source", "Kaynak", "来源"), s.sources || "—"],
            [T(l, "Data checked", "Veri kontrol tarihi", "数据核对日期"), s.checked || "—"],
          ],
        });
      }
      sections.push({ id: "states", title: T(l, "State and territory programs", "Eyalet ve bölge programları", "各州和领地项目"), blocks });
    }
  }

  // 6. Invitation history.
  const inv = buildInvitationInfo(l);
  sections.push({
    id: "invitations",
    title: T(l, "Invitation history", "Davet geçmişi", "邀请历史"),
    blocks: [{ kind: "text", text: inv.intro }, table(inv.headers, inv.rows, [0.13, 0.11, 0.11, 0.13, 0.32, 0.2]), { kind: "text", text: inv.stateNote }, { kind: "text", text: inv.note }],
  });

  // 7. Costs.
  const costs = buildCostsInfo(report, occupationRaw, l, target);
  const costBlocks: Block[] = [
    { kind: "heading", text: costs.govTitle },
    table(costs.govHeaders, costs.gov, [0.26, 0.13, 0.14, 0.14, 0.14, 0.19]),
    { kind: "text", text: costs.govNote },
  ];
  if (costs.authority.length) costBlocks.push({ kind: "heading", text: costs.authorityTitle }, { kind: "text", text: costs.authorityIntro }, table(costs.authorityHeaders, costs.authority, [0.22, 0.18, 0.2, 0.2, 0.2].slice(0, costs.authorityHeaders.length)));
  costBlocks.push({ kind: "heading", text: costs.itemsTitle }, table(costs.itemsHeaders, costs.items, [0.3, 0.25, 0.25, 0.2].slice(0, costs.itemsHeaders.length)));
  costBlocks.push({ kind: "heading", text: costs.sumsTitle }, table(costs.sumsHeaders, costs.sums, [0.3, 0.2, 0.25, 0.25].slice(0, costs.sumsHeaders.length)));
  costs.selectedTotalLines.forEach((t) => costBlocks.push({ kind: "text", text: t }));
  costs.notes.forEach((t) => costBlocks.push({ kind: "text", text: t }));
  if (costs.livingLine) costBlocks.push({ kind: "text", text: costs.livingLine });
  sections.push({ id: "costs", title: T(l, "Costs", "Maliyetler", "费用"), blocks: costBlocks });

  // 8. Typical process.
  const processBlocks: Block[] = [{ kind: "text", text: T(l, "The usual steps for each pathway family and what the sources publish about each. It is generic: it has no dates for you.", "Her yol ailesi için olağan adımlar ve kaynakların her biri hakkında yayımladıkları. Geneldir: size özel tarih içermez.", "各类路径的常见步骤及资料对每一步的公开说明。内容为通用信息，不含针对您的日期。") }];
  for (const f of buildProcessInfo(report, occupationRaw, l)) {
    processBlocks.push({ kind: "heading", text: f.title }, { kind: "text", text: f.applies }, table([T(l, "Step", "Adım", "步骤"), T(l, "Published information", "Yayımlanmış bilgi", "已公布的信息"), T(l, "Source", "Kaynak", "来源")], f.rows.map((r) => [...r]), [0.2, 0.55, 0.25]));
  }
  sections.push({ id: "process", title: T(l, "Typical process", "Tipik süreç", "典型流程"), blocks: processBlocks });

  // 9. Documents and general points.
  const docs = buildDocumentsInfo(report, l);
  const docBlocks: Block[] = [];
  if (docs.rows.length) docBlocks.push(table(docs.headers, docs.rows, [0.2, 0.42, 0.18, 0.2]));
  docBlocks.push(table(docs.extraHeaders, docs.extra, [0.16, 0.62, 0.22]), { kind: "heading", text: docs.pointsTitle }, table(docs.pointsHeaders, docs.points, [0.7, 0.3]));
  sections.push({ id: "documents", title: T(l, "Documents and general points", "Belgeler ve genel noktalar", "文件与一般事项"), blocks: docBlocks });

  // 10. Sources register and the advice statement.
  const states = isCA ? [] : buildStateInfos(report, occupationRaw, l);
  const resources = getResourcesSection(l, isCA ? "CA" : "AU");
  const srcBlocks: Block[] = [table(sourcesHeaders(l), buildSources(report, occupationRaw, states, l).map((r) => [...r]), [0.55, 0.3, 0.15])];
  const links = resources.sections.flatMap((s) => s.links.map((k) => `${k.label} — ${k.url}`));
  if (links.length) srcBlocks.push({ kind: "heading", text: T(l, "Official resources", "Resmi kaynaklar", "官方资源") }, { kind: "lines", lines: links });
  srcBlocks.push({ kind: "text", text: agentStatement(l) });
  sections.push({ id: "sources", title: T(l, "Sources and advice", "Kaynaklar ve danışmanlık", "来源与咨询"), blocks: srcBlocks });

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
