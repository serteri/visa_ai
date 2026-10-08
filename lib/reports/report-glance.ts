/**
 * "At a glance": one row per visa in the fixed order of the report (never ordered by the applicant's data), with how many of the visa's published
 * requirements have information entered / not entered / not collected by the form, and the numeric requirements side by side (your figure,
 * published figure). The counts describe the information, not an outcome: nothing here says a requirement is met.
 */
import type { Locale } from "@/lib/readiness/types";
import { VISA_ORDER, type VisaInfo, visaName } from "./report-visas";
import { T } from "./report-text";

export type GlanceInfo = { intro: string; headers: string[]; rows: string[][]; note: string };

export function buildGlance(infos: VisaInfo[], l: Locale): GlanceInfo {
  const rows = VISA_ORDER.map((k) => infos.find((i) => i.key === k))
    .filter((i): i is VisaInfo => !!i)
    .map((i) => {
      const count = (s: "provided" | "not_provided" | "not_collected") => i.requirements.filter((r) => r.status === s).length;
      const figures = i.requirements
        .filter((r) => r.numeric)
        .map((r) => `${r.numeric!.label}: ${r.numeric!.yours} — ${T(l, "published", "yayımlanmış", "已公布")}: ${r.numeric!.published}`);
      return [i.title, String(count("provided")), String(count("not_provided")), String(count("not_collected")), figures.length ? figures.join("\n") : "—"];
    });
  return {
    intro: T(l, "One row per visa, in the same fixed order for every report. For each visa the counts say how many of its published requirements have information entered, not entered, or not collected by the form; the last column puts your figure next to the published figure.", "Her vize için bir satır; her raporda aynı sabit sırayla. Sayılar, yayımlanmış gerekliliklerden kaçı için bilgi girildiğini, kaçının girilmediğini veya formda toplanmadığını gösterir; son sütun sizin rakamınızı yayımlanmış rakamın yanına koyar.", "每种签证一行，所有报告顺序固定相同。各数字表示该签证已公布的要求中，有多少项已填写信息、未填写或表单未收集；最后一列把您的数字与已公布的数字并列。"),
    headers: [T(l, "Visa", "Vize", "签证"), T(l, "Information entered", "Bilgi girildi", "已填写信息"), T(l, "Not entered", "Girilmedi", "未填写"), T(l, "Not collected by the form", "Formda toplanmıyor", "表单未收集"), T(l, "Your figure and the published figure", "Sizin rakamınız ve yayımlanmış rakam", "您的数字与已公布的数字")],
    rows,
    note: T(l, "The counts describe the information you entered, not an outcome. A figure next to a published figure is shown side by side; it is not a result.", "Sayılar girdiğiniz bilgiyi anlatır, bir sonucu değil. Yayımlanmış rakamın yanındaki rakam yan yana gösterilir; bir sonuç değildir.", "这些数字描述的是您填写的信息，而非结果。与已公布数字并列的数字只是并排展示，不是结论。"),
  };
}
