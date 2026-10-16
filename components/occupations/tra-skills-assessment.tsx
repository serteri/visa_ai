import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TraBlock } from "@/lib/occupations/tra-block";
import { publicPath } from "@/lib/seo/urls";

/** The TRA skills-assessment block. All content comes from lib/occupations/tra-block.ts (registry + sources file). */
export function TraSkillsAssessment({
  block,
  locale,
}: {
  block: TraBlock;
  locale: string;
}) {
  const row =
    "flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:gap-6";
  const rowLabel =
    "w-full shrink-0 text-sm font-semibold text-slate-700 sm:w-64";
  const rowValue = "text-sm text-slate-600";
  const link = "font-medium text-cyan-800 underline";

  return (
    <Card
      className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5"
      data-tra-block={block.caseKind}
    >
      <CardHeader>
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {block.heading}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">{block.intro}</p>
        {block.licensedNote ? (
          <p className="text-sm text-slate-600">{block.licensedNote}</p>
        ) : null}

        <dl>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.authority}</dt>
            <dd className={rowValue}>{block.authorityName}</dd>
          </div>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.programs}</dt>
            <dd className={`${rowValue} space-y-2`}>
              {block.programs.map((p) => (
                <p key={p.id}>
                  <span className="font-medium text-slate-800">{p.name}.</span>{" "}
                  {p.summary}
                </p>
              ))}
            </dd>
          </div>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.processing}</dt>
            <dd className={`${rowValue} space-y-2`}>
              {block.processing.map((p) => (
                <p key={p.program}>
                  <span className="font-medium text-slate-800">
                    {p.program}:
                  </span>{" "}
                  {p.text}
                </p>
              ))}
            </dd>
          </div>
        </dl>

        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {block.labels.fees}
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700">
                  <th className="py-2 pr-4 font-semibold">
                    {block.labels.colProgram}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {block.labels.colFee}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {block.labels.colScope}
                  </th>
                  <th className="py-2 text-right font-semibold">
                    {block.labels.colAmount}
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {block.fees.map((f, i) => (
                  <tr
                    key={`${f.program}-${i}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2 pr-4 font-medium">{f.program}</td>
                    <td className="py-2 pr-4">{f.label}</td>
                    <td className="py-2 pr-4">{f.scope}</td>
                    <td
                      className={`py-2 text-right ${f.total ? "font-semibold text-slate-800" : ""}`}
                    >
                      {f.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {block.countries ? (
          <details className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              {block.countries.title}
            </summary>
            <p className="mt-2">{block.countries.list.join(", ")}</p>
          </details>
        ) : null}

        <dl>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.verified}</dt>
            <dd className={rowValue}>{block.verified}</dd>
          </div>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.sources}</dt>
            <dd className={`${rowValue} space-y-1`}>
              {block.sourceLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </dd>
          </div>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.official}</dt>
            <dd className={`${rowValue} space-y-1`}>
              {block.officialLinks.map((l) => (
                <p key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-official-source
                    className={link}
                  >
                    {l.label}
                  </a>
                </p>
              ))}
            </dd>
          </div>
          <div className={row}>
            <dt className={rowLabel}>{block.labels.tools}</dt>
            <dd className={`${rowValue} space-y-1`}>
              {block.toolLinks.map((l) => (
                <p key={l.path}>
                  <Link
                    href={publicPath(locale, l.path)}
                    data-tool-destination={l.destination}
                    className={link}
                  >
                    {l.label}
                  </Link>
                </p>
              ))}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-slate-500">{block.note}</p>
      </CardContent>
    </Card>
  );
}
