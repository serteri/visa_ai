import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { occupationDistinction } from "@/lib/occupations/distinctions";
import { publicPath } from "@/lib/seo/urls";

/** Source-linked "do not confuse" block; renders nothing for occupations without a documented confusion. */
export function OccupationDistinction({ code, locale }: { code: string; locale: string }) {
  const d = occupationDistinction(code, locale);
  if (!d) return null;
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5" data-occupation-distinction={code}>
      <CardHeader>
        <h2 className="text-lg font-semibold leading-none tracking-tight">{d.heading}</h2>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        {d.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-medium text-cyan-800">
          {d.compare && (
            <Link className="underline" href={publicPath(locale, `/occupations/${d.compare.slug}`)}>
              {d.compare.label}
            </Link>
          )}
          {d.sources.map((s) => (
            <a key={s.url} data-official-source className="underline" href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
