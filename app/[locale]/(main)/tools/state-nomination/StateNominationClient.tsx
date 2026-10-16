"use client";
import { useState } from "react";
import {
  researchText,
  STATE_RESEARCH_SOURCES,
} from "@/lib/marketing/research-journey";
import { ResearchLinks } from "@/components/research-links";
import { matchOccupationToState } from "@/lib/state-nomination/occupation-match";
import provenance from "@/src/data/occupation-list-provenance.json";

export function StateNominationClient({ locale }: { locale: string }) {
  const [code, setCode] = useState("");
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  const validCode = /^\d{6}$/.test(code);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="max-w-3xl space-y-4">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {text(
              "State nomination references",
              "Eyalet adaylık kaynakları",
              "州提名参考资料",
            )}
          </h1>
          <p className="text-lg text-slate-600">
            {text(
              "Explore official state and territory criteria and entries in our held occupation-list data. List inclusion is not nomination or personal visa eligibility.",
              "Resmî eyalet ve bölge kriterlerini ve elimizdeki meslek listesi kayıtlarını araştırın. Liste kaydı, adaylık veya kişisel vize uygunluğu anlamına gelmez.",
              "查阅官方州与领地标准及我们保存的职业清单记录。列入清单不代表获得提名或具备个人签证资格。",
            )}
          </p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            {text(
              "Historical reference data: the held sources include 2025–26 lists. Dates below describe our source checks, not current program availability. Requirements differ by state, visa, stream and circumstances; current official criteria control. No points-based ranking, nomination prediction or current open/closed status is provided.",
              "Geçmiş kaynak verileri: 2025–26 listeleri içerir. Aşağıdaki tarihler kaynak kontrolleridir; programın güncel durumunu göstermez. Şartlar eyalet, vize, program ve duruma göre değişir; güncel resmî kriterler geçerlidir. Puan sıralaması, adaylık tahmini veya güncel açık/kapalı durumu sunulmaz.",
              "历史参考数据包含 2025–26 年清单。下方日期为来源核对日期，并非当前项目开放状态。要求因州、签证、类别与个人情况而异，以当前官方标准为准。不提供积分排名、提名预测或当前开放状态。",
            )}
          </p>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <label
            htmlFor="state-occupation"
            className="block text-sm font-semibold text-slate-900"
          >
            {text(
              "ANZSCO code (optional)",
              "ANZSCO kodu (isteğe bağlı)",
              "ANZSCO 代码（可选）",
            )}
          </label>
          <input
            id="state-occupation"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="331212"
            className="mt-3 min-h-12 w-full max-w-sm rounded-lg border border-slate-300 px-4 text-slate-900"
          />
          <p className="mt-3 text-sm text-slate-600">
            {text(
              "Enter a six-digit code to inspect our held list entries. Missing coverage is not a finding about nomination.",
              "Kayıtlarımız için altı haneli kod girin. Veri eksikliği, adaylık hakkında bir sonuç değildir.",
              "输入六位代码查看保存的清单记录。缺少数据不代表提名结果。",
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {STATE_RESEARCH_SOURCES.map((state) => {
            const factId =
              state.code === "NSW"
                ? "state_occ_nsw_unit_groups"
                : `state_occ_${state.code.toLowerCase()}`;
            const fact = provenance.facts.find((f) => f.id === factId);
            const sourceLabel = fact?.sourceDocument
              ? [fact.sourceDocument]
                  .flat()
                  .map((source) =>
                    source
                      .split(";")
                      .map((part) => part.trim().split(/[\\/]/).at(-1))
                      .join("; "),
                  )
                  .join("; ")
              : undefined;
            const entries = validCode
              ? (["190", "491"] as const).filter((subclass) => {
                  const match = matchOccupationToState(
                    code,
                    state.code,
                    subclass,
                  );
                  return (
                    match.type === "MATCH" ||
                    (match.type === "UNIT_GROUP_ONLY" && match.onUnitGroupList)
                  );
                })
              : [];
            return (
              <section
                key={state.code}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <h2 className="text-xl font-semibold text-slate-900">
                  {state.code} · {state.name}
                </h2>
                {validCode && (
                  <p className="mt-3 text-sm text-slate-700">
                    {entries.length
                      ? `${text("Held list references", "Kayıtlı liste referansları", "保存的清单参考")}: ${entries.join(" / ")}${state.code === "NSW" ? ` (${text("four-digit unit group only", "yalnızca dört haneli birim grubu", "仅四位单元组")})` : ""}`
                      : text(
                          "No positive entry established in our held data. Check the official criteria; some states have no occupation-level list in our dataset.",
                          "Verilerimizde bir kayıt doğrulanmadı. Bazı eyaletler için meslek düzeyinde liste yoktur; resmî kriterlere bakın.",
                          "保存的数据中未确认收录。部分州在本数据集中没有职业级清单，请查阅官方标准。",
                        )}
                  </p>
                )}
                <p className="mt-3 break-words text-xs leading-relaxed text-slate-500">
                  {text("Held source", "Kayıtlı kaynak", "保存的来源")}:{" "}
                  {sourceLabel
                    ? `${sourceLabel} · ${text("checked", "kontrol", "核对")}: ${fact?.lastVerified}`
                    : text(
                        "No occupation-level source/date held for this state.",
                        "Bu eyalet için meslek düzeyinde kaynak/tarih yok.",
                        "未保存该州的职业级来源与日期。",
                      )}
                </p>
                {state.code === "ACT" && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">
                    {text(
                      "For unmarked ACT rows, subclass coverage is inferred in the held data, not explicitly stated. Verify the official program criteria.",
                      "İşaretsiz ACT satırlarında alt sınıf kapsamı veride çıkarımdır; açıkça belirtilmemiştir. Resmî program kriterlerini kontrol edin.",
                      "对于未标注的 ACT 记录，数据中的子类范围为推断，并非明确说明。请核对官方项目标准。",
                    )}
                  </p>
                )}
                <a
                  href={state.url}
                  data-official-source
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block py-2 text-sm font-semibold text-cyan-900 underline"
                >
                  {text(
                    "Read official criteria",
                    "Resmî kriterler",
                    "阅读官方标准",
                  )}{" "}
                  →
                </a>
              </section>
            );
          })}
        </div>
        <ResearchLinks locale={locale} code={validCode ? code : undefined} />
      </div>
    </main>
  );
}
