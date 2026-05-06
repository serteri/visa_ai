"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type MatchResult = {
  matchPercentage: number;
  matchedDuties: string[];
  missingDuties: string[];
  recommendedKeywords: string[];
};

type AnzscoMatcherProps = {
  targetOccupation?: string | null;
};

function percentageTone(score: number): string {
  if (score >= 85) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-rose-700";
}

function percentageTrack(score: number): string {
  if (score >= 85) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

export function AnzscoMatcher({ targetOccupation }: AnzscoMatcherProps) {
  const [cvText, setCvText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInput = cvText.trim().length > 0;
  const canSubmit = !!targetOccupation && !!hasInput && !isLoading;

  const score = Math.max(0, Math.min(100, result?.matchPercentage ?? 0));
  const ringStyle = useMemo(
    () => ({
      background: `conic-gradient(${percentageTrack(score)} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg)`,
    }),
    [score]
  );

  function clearAll() {
    setCvText("");
    setResult(null);
    setError(null);
  }

  async function runMatch() {
    if (!targetOccupation || !hasInput) return;

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/anzsco-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetOccupation,
          cvText: cvText.trim(),
        }),
      });

      const payload = (await response.json()) as MatchResult | { error?: string };
      if (!response.ok) {
        const message = "error" in payload ? payload.error : "ANZSCO matching failed.";
        throw new Error(message || "ANZSCO matching failed.");
      }

      setResult(payload as MatchResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run ANZSCO duty matcher.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>AI ANZSCO Duty Matcher</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Enterprise-grade CV alignment check for Australian migration assessment workflows.
            </p>
          </div>
          {targetOccupation ? (
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              Target Occupation: {targetOccupation}
            </Badge>
          ) : (
            <Badge className="border-rose-200 bg-rose-50 text-rose-700">Occupation Missing</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Candidate CV Text</p>
          <Textarea
            value={cvText}
            onChange={(event) => {
              setCvText(event.target.value);
              setError(null);
            }}
            placeholder="Paste the full CV text, including role summaries, duties, projects, and measurable outcomes..."
            className="min-h-56 border-slate-300 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!canSubmit} onClick={runMatch}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Analyze CV"
            )}
          </Button>
          {cvText && !isLoading && (
            <Button type="button" variant="outline" onClick={clearAll}>
              Clear Inputs
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">
              Scanning CV against official ANZSCO standards...
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded bg-primary/20">
              <div className="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] bg-primary" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}

        {result && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Match Percentage</p>
                <p className="mt-1 text-sm text-slate-600">ANZSCO duty alignment estimate</p>
              </div>

              <div className="relative h-28 w-28 rounded-full p-2" style={ringStyle}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
                  <span className={["text-2xl font-bold", percentageTone(score)].join(" ")}>{score}%</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <p className="text-sm font-semibold text-emerald-800">Matched Duties</p>
                <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                  {result.matchedDuties.length === 0 && <li>No strong duty matches identified.</li>}
                  {result.matchedDuties.map((duty) => (
                    <li key={duty} className="rounded-md bg-white/80 px-3 py-2">
                      {`✅ ${duty}`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <p className="text-sm font-semibold text-rose-800">Missing Duties (Action Required)</p>
                <ul className="mt-3 space-y-2 text-sm text-rose-900">
                  {result.missingDuties.length === 0 && <li>No critical gaps detected.</li>}
                  {result.missingDuties.map((duty) => (
                    <li key={duty} className="rounded-md bg-white/80 px-3 py-2">
                      {`🔴 ${duty}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-900">Pro-Tip / Recommended Keywords</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.recommendedKeywords.length === 0 && (
                  <p className="text-sm text-sky-900/80">No additional keywords suggested.</p>
                )}
                {result.recommendedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-medium text-sky-900"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
