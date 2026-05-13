"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, BookOpen, ArrowRight } from "lucide-react";

type TestType = "ielts" | "pte" | "toefl" | "oet";
type OetGrade = "A" | "B" | "C+" | "";

interface IeltsScores {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

interface PteScores {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

interface ToeflScores {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

interface OetScores {
  listening: OetGrade;
  reading: OetGrade;
  writing: OetGrade;
  speaking: OetGrade;
}

const ENGLISH_LEVELS = {
  competent: { label: "Competent English", points: 0 },
  proficient: { label: "Proficient English", points: 10 },
  superior: { label: "Superior English", points: 20 },
};

const REQUIREMENTS = {
  competent: {
    ielts: "6.0 in each band",
    pte: "50 in each skill",
    toefl: "12L, 13R, 21W, 18S",
  },
  proficient: {
    ielts: "7.0 in each band",
    pte: "65 in each skill",
    toefl: "24L, 24R, 27W, 23S",
  },
  superior: {
    ielts: "8.0 in each band",
    pte: "79 in each skill",
    toefl: "28L, 29R, 30W, 26S",
  },
};

function getIeltsLevel(scores: IeltsScores): "superior" | "proficient" | "competent" | "insufficient" {
  const minBand = Math.min(scores.listening, scores.reading, scores.writing, scores.speaking);
  
  if (minBand >= 8.0) return "superior";
  if (minBand >= 7.0) return "proficient";
  if (minBand >= 6.0) return "competent";
  return "insufficient";
}

function getPteLevel(scores: PteScores): "superior" | "proficient" | "competent" | "insufficient" {
  const minScore = Math.min(scores.listening, scores.reading, scores.writing, scores.speaking);
  
  if (minScore >= 79) return "superior";
  if (minScore >= 65) return "proficient";
  if (minScore >= 50) return "competent";
  return "insufficient";
}

function getToeflLevel(scores: ToeflScores): "superior" | "proficient" | "competent" | "insufficient" {
  // Check against specific requirements
  const meetsCompetent =
    scores.listening >= 12 &&
    scores.reading >= 13 &&
    scores.writing >= 21 &&
    scores.speaking >= 18;

  const meetsProficient =
    scores.listening >= 24 &&
    scores.reading >= 24 &&
    scores.writing >= 27 &&
    scores.speaking >= 23;

  const meetsSuperior =
    scores.listening >= 28 &&
    scores.reading >= 29 &&
    scores.writing >= 30 &&
    scores.speaking >= 26;

  if (meetsSuperior) return "superior";
  if (meetsProficient) return "proficient";
  if (meetsCompetent) return "competent";
  return "insufficient";
}

function getOetLevel(scores: OetScores): "proficient" | "insufficient" {
  // OET: all must be B or above to pass
  const allBOrAbove =
    ["B", "A"].includes(scores.listening) &&
    ["B", "A"].includes(scores.reading) &&
    ["B", "A"].includes(scores.writing) &&
    ["B", "A"].includes(scores.speaking);

  return allBOrAbove ? "proficient" : "insufficient";
}

const TIPS = [
  "PTE is generally considered easier to score higher on compared to IELTS",
  "Both IELTS Academic and IELTS General are accepted for Australian visa applications",
  "You can use different test types for different components if they were taken within the validity period",
];

export function EnglishPointsClient({ locale }: { locale: string }) {
  const [testType, setTestType] = useState<TestType>("ielts");
  const [ieltsTScores, setIeltsScores] = useState<IeltsScores>({
    listening: 6.0,
    reading: 6.0,
    writing: 6.0,
    speaking: 6.0,
  });
  const [pteScores, setPteScores] = useState<PteScores>({
    listening: 50,
    reading: 50,
    writing: 50,
    speaking: 50,
  });
  const [toeflScores, setToeflScores] = useState<ToeflScores>({
    listening: 12,
    reading: 13,
    writing: 21,
    speaking: 18,
  });
  const [oetScores, setOetScores] = useState<OetScores>({
    listening: "B",
    reading: "B",
    writing: "B",
    speaking: "B",
  });

  // Calculate current level
  const currentLevel =
    testType === "ielts"
      ? getIeltsLevel(ieltsTScores)
      : testType === "pte"
        ? getPteLevel(pteScores)
        : testType === "toefl"
          ? getToeflLevel(toeflScores)
          : getOetLevel(oetScores);

  const points = currentLevel === "insufficient" ? 0 : ENGLISH_LEVELS[currentLevel as keyof typeof ENGLISH_LEVELS].points;

  // Calculate improvement needed
  const getImprovementNeeded = () => {
    if (testType === "ielts") {
      const minBand = Math.min(
        ieltsTScores.listening,
        ieltsTScores.reading,
        ieltsTScores.writing,
        ieltsTScores.speaking
      );

      if (minBand >= 8.0) return null;
      if (minBand >= 7.0)
        return `Improve your lowest band from ${minBand} to 8.0 to unlock +10 more points`;

      const nextTarget = minBand < 7.0 ? 7.0 : 8.0;
      return `Improve your lowest band from ${minBand} to ${nextTarget} to unlock +10 more points`;
    }

    if (testType === "pte") {
      const minScore = Math.min(
        pteScores.listening,
        pteScores.reading,
        pteScores.writing,
        pteScores.speaking
      );

      if (minScore >= 79) return null;
      if (minScore >= 65)
        return `Improve your lowest score from ${minScore} to 79 to unlock +10 more points`;

      const nextTarget = minScore < 65 ? 65 : 79;
      return `Improve your lowest score from ${minScore} to ${nextTarget} to unlock +10 more points`;
    }

    if (testType === "toefl") {
      if (
        toeflScores.listening >= 28 &&
        toeflScores.reading >= 29 &&
        toeflScores.writing >= 30 &&
        toeflScores.speaking >= 26
      )
        return null;

      if (
        toeflScores.listening >= 24 &&
        toeflScores.reading >= 24 &&
        toeflScores.writing >= 27 &&
        toeflScores.speaking >= 23
      ) {
        const gaps = [];
        if (toeflScores.listening < 28) gaps.push(`Listening from ${toeflScores.listening} to 28`);
        if (toeflScores.reading < 29) gaps.push(`Reading from ${toeflScores.reading} to 29`);
        if (toeflScores.writing < 30) gaps.push(`Writing from ${toeflScores.writing} to 30`);
        if (toeflScores.speaking < 26) gaps.push(`Speaking from ${toeflScores.speaking} to 26`);
        return `Improve: ${gaps.join(", ")} to unlock +10 more points`;
      }

      const gaps = [];
      if (toeflScores.listening < 24) gaps.push(`Listening from ${toeflScores.listening} to 24`);
      if (toeflScores.reading < 24) gaps.push(`Reading from ${toeflScores.reading} to 24`);
      if (toeflScores.writing < 27) gaps.push(`Writing from ${toeflScores.writing} to 27`);
      if (toeflScores.speaking < 23) gaps.push(`Speaking from ${toeflScores.speaking} to 23`);
      return `Improve: ${gaps.join(", ")} to unlock +10 more points`;
    }

    return null;
  };

  const improvementNeeded = getImprovementNeeded();

  const levelColor =
    currentLevel === "superior"
      ? "from-purple-600 to-purple-400"
      : currentLevel === "proficient"
        ? "from-green-600 to-green-400"
        : currentLevel === "competent"
          ? "from-blue-600 to-blue-400"
          : "from-red-600 to-red-400";

  const levelLabel =
    currentLevel === "superior"
      ? ENGLISH_LEVELS.superior.label
      : currentLevel === "proficient"
        ? ENGLISH_LEVELS.proficient.label
        : currentLevel === "competent"
          ? ENGLISH_LEVELS.competent.label
          : "Does Not Meet Minimum";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            English Test Points Calculator
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            See how many points your English test score is worth
          </p>
        </div>

        {/* Test Type Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              {(["ielts", "pte", "toefl", "oet"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTestType(type)}
                  className={`rounded-lg px-6 py-2.5 font-semibold transition-all ${
                    testType === type
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "border-2 border-slate-200 text-slate-700 hover:border-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500"
                  }`}
                >
                  {type === "ielts"
                    ? "IELTS"
                    : type === "pte"
                      ? "PTE Academic"
                      : type === "toefl"
                        ? "TOEFL iBT"
                        : "OET"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {testType === "ielts" && (
              <div className="grid gap-4 md:grid-cols-2">
                {(["listening", "reading", "writing", "speaking"] as const).map((skill) => (
                  <div key={skill}>
                    <label className="mb-2 block text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                      {skill}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={9}
                      step={0.5}
                      value={ieltsTScores[skill]}
                      onChange={(e) =>
                        setIeltsScores({
                          ...ieltsTScores,
                          [skill]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {testType === "pte" && (
              <div className="grid gap-4 md:grid-cols-2">
                {(["listening", "reading", "writing", "speaking"] as const).map((skill) => (
                  <div key={skill}>
                    <label className="mb-2 block text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                      {skill}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={90}
                      value={pteScores[skill]}
                      onChange={(e) =>
                        setPteScores({
                          ...pteScores,
                          [skill]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {testType === "toefl" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Listening (0-30)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={toeflScores.listening}
                    onChange={(e) =>
                      setToeflScores({
                        ...toeflScores,
                        listening: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Reading (0-30)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={toeflScores.reading}
                    onChange={(e) =>
                      setToeflScores({
                        ...toeflScores,
                        reading: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Writing (0-30)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={toeflScores.writing}
                    onChange={(e) =>
                      setToeflScores({
                        ...toeflScores,
                        writing: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Speaking (0-30)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={toeflScores.speaking}
                    onChange={(e) =>
                      setToeflScores({
                        ...toeflScores,
                        speaking: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            {testType === "oet" && (
              <div className="grid gap-4 md:grid-cols-2">
                {(["listening", "reading", "writing", "speaking"] as const).map((skill) => (
                  <div key={skill}>
                    <label className="mb-2 block text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                      {skill}
                    </label>
                    <select
                      value={oetScores[skill]}
                      onChange={(e) =>
                        setOetScores({
                          ...oetScores,
                          [skill]: e.target.value as OetGrade,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select grade</option>
                      <option value="A">A (Mastery)</option>
                      <option value="B">B (Proficiency)</option>
                      <option value="C+">C+ (Competence)</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card className={`bg-gradient-to-r ${levelColor} text-white`}>
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-semibold opacity-90">Your English Level</p>
            <h2 className="text-4xl font-bold">{levelLabel}</h2>
            <div className="mt-4 flex items-center justify-center gap-3">
              <TrendingUp className="h-6 w-6" />
              <span className="text-3xl font-bold">+{points} points</span>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Points Breakdown by Level</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left font-semibold">Level</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {testType === "ielts" ? "IELTS" : testType === "pte" ? "PTE" : "TOEFL"}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { key: "competent", label: "Competent" },
                    { key: "proficient", label: "Proficient" },
                    { key: "superior", label: "Superior" },
                  ] as const
                ).map(({ key, label }) => (
                  <tr
                    key={key}
                    className={`border-b border-slate-100 dark:border-slate-800 ${
                      currentLevel === key ? "bg-green-50 dark:bg-green-900/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {testType === "ielts"
                        ? REQUIREMENTS[key].ielts
                        : testType === "pte"
                          ? REQUIREMENTS[key].pte
                          : REQUIREMENTS[key].toefl}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {ENGLISH_LEVELS[key].points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* What-If Section */}
        {improvementNeeded && currentLevel !== "superior" && (
          <Card className="border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  How much do you need to improve?
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  {improvementNeeded}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Tips for Improving Your Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {TIPS.map((tip, index) => (
                <li key={index} className="flex gap-3">
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {index + 1}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 dark:border-indigo-800 dark:from-indigo-900/20 dark:to-purple-900/20">
          <CardContent className="space-y-4 pt-6 text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              See how English affects your total points score
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Factor in your age, education, and work experience to get your complete visa points score.
            </p>
            <Link href={`/${locale}/tools/points-calculator`}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                Go to Full Points Calculator
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
