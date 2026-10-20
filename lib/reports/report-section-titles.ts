/** The sections of the Visa Information Report, in their fixed order: one list for the report itself, the pre-payment preview and the sales page. */
import type { Locale } from "@/lib/readiness/types";
import { T } from "@/lib/reports/report-text";

export type ReportSectionId = "summary" | "details" | "glance" | "points" | "visas" | "states" | "invitations" | "costs" | "process" | "documents" | "pointsExamples" | "stateDetail" | "sources";

export function reportSectionTitle(id: ReportSectionId, l: Locale): string {
  switch (id) {
    case "summary":
      return T(l, "Professional summary", "Profesyonel özet", "专业摘要");
    case "details":
      return T(l, "Applicant information", "Başvuru sahibi bilgileri", "申请人信息");
    case "glance":
      return T(l, "At a glance", "Bir bakışta", "一览");
    case "points":
      return T(l, "Points", "Puanlar", "积分");
    case "visas":
      return T(l, "Visa information", "Vize bilgileri", "签证信息");
    case "states":
      return T(l, "State and territory programs", "Eyalet ve bölge programları", "各州和领地项目");
    case "invitations":
      return T(l, "Invitation history", "Davet geçmişi", "邀请历史");
    case "costs":
      return T(l, "Costs", "Maliyetler", "费用");
    case "process":
      return T(l, "Typical process", "Tipik süreç", "典型流程");
    case "documents":
      return T(l, "Documents and general points", "Belgeler ve genel noktalar", "文件与一般事项");
    case "pointsExamples":
      return T(l, "Published points-table examples", "Yayımlanmış puan tablosu örnekleri", "已公布积分表示例");
    case "stateDetail":
      return T(l, "Additional published detail: states and territories", "Ek yayımlanmış ayrıntılar: eyaletler ve bölgeler", "补充已公布细节：各州和领地");
    case "sources":
      return T(l, "Sources and advice", "Kaynaklar ve danışmanlık", "来源与咨询");
  }
}

export const REPORT_SECTION_IDS: ReportSectionId[] = ["summary", "details", "glance", "points", "visas", "states", "invitations", "costs", "process", "documents", "pointsExamples", "stateDetail", "sources"];
