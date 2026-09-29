import type { Locale } from "./types";

// Types and customer-facing text of the visa hard-gate matrix. Kept free of the occupation datasets so the client
// result page can import it without pulling them into the bundle (the evaluation itself is in ./visa-gates).

export type GateStatus = "met" | "not_met" | "unknown" | "future";


export type GateResult = {
  id: string;
  visa: string;
  stream: string | null;
  status: GateStatus;
  /** The requirement, in the report's language. */
  label: string;
  /** Why it is met / not met / unknown, in the report's language. */
  reason: string;
  /** "Home Affairs, Subclass 186 page, p.7" (localized). */
  citation: string;
  quote: string;
};

export type PathwayGateStatus = "not_eligible_now" | "conditional" | "eligible";

export type PathwayGates = {
  /** Report pathway key: 189, 190, 491, 186, 482, 485, 500, 820. */
  visa: string;
  status: PathwayGateStatus;
  gates: GateResult[];
  notMet: GateResult[];
  unknown: GateResult[];
  future: GateResult[];
  /** 186: the streams still open (none not-met), or all streams evaluated. */
  streamsConsidered?: string[];
  /** 186: a stream that is out (a not-met gate) while another remains open, with its failed gates. */
  closedStreams?: Array<{ stream: string; notMet: GateResult[] }>;
};


export const T = (locale: Locale, en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);


const VISA_LABEL: Record<string, [string, string, string]> = {
  "189": ["Subclass 189", "Subclass 189", "189 子类"],
  "190": ["Subclass 190", "Subclass 190", "190 子类"],
  "491": ["Subclass 491", "Subclass 491", "491 子类"],
  "186": ["Subclass 186", "Subclass 186", "186 子类"],
  "482": ["Subclass 482", "Subclass 482", "482 子类"],
  "485": ["Subclass 485", "Subclass 485", "485 子类"],
  "500": ["Subclass 500", "Subclass 500", "500 子类"],
  "820": ["Subclass 820/801", "Subclass 820/801", "820/801 子类"],
};

export function visaGateLabel(visa: string, locale: Locale): string {
  const v = VISA_LABEL[visa];
  return v ? T(locale, v[0], v[1], v[2]) : `Subclass ${visa}`;
}


/** Every visa key the matrix covers, keyed as the report keys its pathways. */
export const GATED_VISAS = ["189", "190", "491", "186", "482", "485", "500", "820"] as const;


export function pathwayGateLabel(status: PathwayGateStatus, locale: Locale): string {
  return status === "not_eligible_now"
    ? T(locale, "Not eligible now", "Şu anda uygun değil", "目前不符合条件")
    : status === "conditional"
      ? T(locale, "Conditional", "Koşullu", "有条件")
      : T(locale, "Eligible to pursue", "İlerlemeye uygun", "可继续推进");
}

/** One line per failed gate: "label -- why (citation)". */
export function failedGateLines(p: PathwayGates): string[] {
  return p.notMet.map((g) => `${g.label} -- ${g.reason} (${g.citation})`);
}

/** What must be true for a Conditional pathway: the unknown gates, with citations. */
export function conditionalGateLines(p: PathwayGates): string[] {
  const lines = p.unknown.map((g) => `${g.label} (${g.citation})`);
  const closed = (p.closedStreams ?? []).map((c) => `[${c.stream}: ${c.notMet.map((g) => `${g.label} -- ${g.reason} (${g.citation})`).join("; ")}]`);
  return [...lines, ...closed];
}

/** The visas the report evaluates, as gate keys (801 shares 820's gates), in the report's pathway order. */
export function reportedGateVisas(pathways: Array<{ subclass: string }>): string[] {
  const keys = pathways.map((p) => (p.subclass === "801" ? "820" : p.subclass)).filter((k) => (GATED_VISAS as readonly string[]).includes(k));
  return Array.from(new Set(keys));
}

export function gateSectionTitle(locale: Locale): string {
  return T(locale, "Eligibility check by visa (mandatory requirements)", "Vize bazında uygunluk kontrolü (zorunlu şartlar)", "按签证核对资格（强制性要求）");
}

export function gateSummaryText(p: PathwayGates, locale: Locale): string {
  const head = `${visaGateLabel(p.visa, locale)}: ${pathwayGateLabel(p.status, locale)}`;
  if (p.status === "not_eligible_now") {
    return `${head}. ${T(locale, "Failed", "Karşılanmayan", "未满足")}: ${failedGateLines(p).join("; ")}.`;
  }
  if (p.status === "conditional") {
    return `${head}. ${T(locale, "Must be true", "Doğru olması gerekenler", "须满足")}: ${conditionalGateLines(p).join("; ")}.`;
  }
  const later = p.future.length ? ` ${T(locale, "Later steps", "Sonraki adımlar", "后续步骤")}: ${p.future.map((g) => g.label).join("; ")}.` : "";
  return `${head}.${later}`;
}
