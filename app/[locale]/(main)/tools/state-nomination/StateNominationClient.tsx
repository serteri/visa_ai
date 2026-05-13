"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronDown, CheckCircle, AlertCircle, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import statesData from "@/src/data/states.json";
import anzscoData from "@/src/data/anzsco-list.json";

type State = (typeof statesData.states)[0];
type Occupation = (typeof anzscoData)[0];

const VISA_BADGES = {
  "190": { label: "190", color: "bg-blue-100 text-blue-800" },
  "491": { label: "491", color: "bg-green-100 text-green-800" },
};

const STATE_COLORS: Record<string, string> = {
  NSW: "from-blue-600 to-blue-400",
  VIC: "from-indigo-700 to-indigo-500",
  WA: "from-yellow-500 to-yellow-400",
  SA: "from-red-600 to-red-400",
  QLD: "from-red-700 to-red-500",
  TAS: "from-green-600 to-green-400",
  ACT: "from-cyan-600 to-cyan-400",
  NT: "from-orange-600 to-orange-400",
};

function getCompetitionColor(level: string): string {
  switch (level) {
    case "low":
    case "low-medium":
      return "text-green-600 bg-green-50";
    case "medium":
    case "medium-low":
      return "text-yellow-600 bg-yellow-50";
    case "high":
    case "very-high":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function competitionLabel(level: string): string {
  const map: Record<string, string> = {
    "low": "Low 🟢",
    "low-medium": "Low-Medium 🟡",
    "medium": "Medium 🟡",
    "medium-low": "Medium-Low 🟡",
    "high": "High 🔴",
    "very-high": "Very High 🔴",
    "not-available": "N/A",
  };
  return map[level] || level;
}

const FAQ_ITEMS = [
  {
    question: "What is state nomination (190 & 491)?",
    answer:
      "State nomination is when an Australian state sponsors you for skilled migration. The 190 Skilled Nominated visa adds 5 bonus points, while 491 Skilled Work Regional adds 15 points but requires living in designated regional areas for 3 years.",
  },
  {
    question: "How much does 190 nomination add to my points?",
    answer:
      "A 190 Skilled Nominated visa sponsorship adds exactly 5 additional points to your total score. This is the key advantage of state sponsorship for skilled migration.",
  },
  {
    question: "How much does 491 nomination add?",
    answer:
      "The 491 Skilled Work Regional visa adds 15 points plus 10 location bonus points (5 + 5 year) if you meet the regional living requirements for 3+ years. However, it requires a 3-year commitment to designated regional areas.",
  },
  {
    question: "Which state is easiest to get nominated?",
    answer:
      "Northern Territory and Tasmania typically have the lowest competition and fastest processing times. However, the 'easiest' state depends on your occupation, points, and location preferences. Use this tool to check which states actively sponsor your occupation.",
  },
];

export function StateNominationClient({ locale }: { locale: string }) {
  const [selectedOccupationCode, setSelectedOccupationCode] = useState<string>("");
  const [occupationSearch, setOccupationSearch] = useState<string>("");
  const [points, setPoints] = useState<number>(70);
  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Filter occupations for autocomplete
  const filteredOccupations = useMemo(() => {
    if (!occupationSearch) return [];
    const search = occupationSearch.toLowerCase();
    return anzscoData
      .filter((occ) => occ.code.includes(search) || occ.title.toLowerCase().includes(search))
      .slice(0, 8);
  }, [occupationSearch]);

  // Categorize and sort states
  const categorizedStates = useMemo(() => {
    const selectedOcc = selectedOccupationCode
      ? anzscoData.find((o) => o.code === selectedOccupationCode)
      : null;

    const statesWithMatches = statesData.states.map((state) => {
      const hasOccupationMatch = selectedOcc
        ? state.priorityOccupations.some((po) => po.code === selectedOccupationCode)
        : false;

      const pointsSufficient = points >= state.minimumPointsGeneral;
      const isOpen =
        state.offshoreAvailability === "open" || state.onshoreAvailability === "open";

      return {
        state,
        hasOccupationMatch,
        pointsSufficient,
        isOpen,
      };
    });

    // Sort: open + match + sufficient points first
    const sorted = statesWithMatches.sort((a, b) => {
      const scoreA =
        (a.isOpen ? 3 : 0) +
        (a.hasOccupationMatch ? 2 : 0) +
        (a.pointsSufficient ? 1 : 0);
      const scoreB =
        (b.isOpen ? 3 : 0) +
        (b.hasOccupationMatch ? 2 : 0) +
        (b.pointsSufficient ? 1 : 0);
      return scoreB - scoreA;
    });

    return sorted;
  }, [selectedOccupationCode, points]);

  const hasSearch = selectedOccupationCode || points;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            State Nomination Finder
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Find which Australian states will nominate you for 190 or 491 visa
          </p>
        </div>

        {/* Input Section */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Occupation Search */}
                <div className="relative md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Occupation (ANZSCO code or name)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={occupationSearch}
                      onChange={(e) => {
                        setOccupationSearch(e.target.value);
                        setShowOccupationDropdown(true);
                      }}
                      onFocus={() => setShowOccupationDropdown(true)}
                      onBlur={() => setTimeout(() => setShowOccupationDropdown(false), 200)}
                      placeholder="e.g. 261313 or Software Engineer"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                    {showOccupationDropdown && filteredOccupations.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
                        {filteredOccupations.map((occ) => (
                          <button
                            key={occ.code}
                            onClick={() => {
                              setSelectedOccupationCode(occ.code);
                              setOccupationSearch(
                                `${occ.code} - ${occ.title}`
                              );
                              setShowOccupationDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <div className="font-medium text-slate-900 dark:text-white">
                              {occ.code}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {occ.title}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedOccupationCode && (
                      <button
                        onClick={() => {
                          setSelectedOccupationCode("");
                          setOccupationSearch("");
                        }}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {selectedOccupationCode && (
                    <p className="mt-2 text-xs text-green-600">
                      ✓ Selected: {selectedOccupationCode}
                    </p>
                  )}
                </div>

                {/* Points Input */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Your Points Score
                  </label>
                  <input
                    type="number"
                    min={65}
                    max={130}
                    value={points}
                    onChange={(e) => setPoints(Math.max(65, Math.min(130, parseInt(e.target.value) || 0)))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Range: 65–130 points
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedOccupationCode
                  ? `Showing states for ${selectedOccupationCode} with ${points} points`
                  : "Enter your occupation and points score to see matching states"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* State Cards Grid */}
        {hasSearch && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Matching States ({categorizedStates.length})
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categorizedStates.map(
                ({ state, hasOccupationMatch, pointsSufficient, isOpen }) => (
                  <Card
                    key={state.code}
                    className={`overflow-hidden transition-all ${
                      !isOpen ? "opacity-70" : ""
                    }`}
                  >
                    {/* Header Banner */}
                    <div className={`bg-gradient-to-r ${STATE_COLORS[state.code]} px-4 py-3`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {state.icon} {state.code}
                          </h3>
                          <p className="text-sm text-white/90">{state.name}</p>
                        </div>
                        {isOpen ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" /> Open
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="mr-1 h-3 w-3" /> Closed
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="space-y-4 pt-4">
                      {/* Visa Types */}
                      <div className="flex flex-wrap gap-2">
                        {state.visaTypes.map((visa) => {
                          const visaCode = visa.code as keyof typeof VISA_BADGES;
                          return (
                            <Badge
                              key={visa.code}
                              className={VISA_BADGES[visaCode]?.color || "bg-gray-100 text-gray-800"}
                            >
                              {visa.code} {visa.status !== "Open" && `(${visa.status})`}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Points Requirement */}
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Min Points Required
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">
                            {state.minimumPointsGeneral}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Your: {points}
                          </span>
                          {pointsSufficient ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>

                      {/* Processing Time & Competition */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Processing Time
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {state.processingTimeWeeks}w
                          </p>
                        </div>
                        <div className={`rounded-lg p-2 ${getCompetitionColor(state.competitionLevel)}`}>
                          <p className="text-xs font-medium">Competition</p>
                          <p className="text-sm font-semibold">
                            {competitionLabel(state.competitionLevel).split(" ")[0]}
                          </p>
                        </div>
                      </div>

                      {/* Occupation Match */}
                      {selectedOccupationCode && (
                        <div
                          className={`rounded-lg p-2 ${
                            hasOccupationMatch
                              ? "border-l-4 border-green-600 bg-green-50 dark:bg-green-900/20"
                              : "border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-900/20"
                          }`}
                        >
                          {hasOccupationMatch ? (
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                              ✓ Your occupation is in demand here
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Check official website for your occupation
                            </p>
                          )}
                        </div>
                      )}

                      {/* CTA Button */}
                      <a
                        href={`https://www.${state.code === "ACT" ? "act.gov.au/skilled-migration" : state.code === "NT" ? "migration.nt.gov.au" : `migration.${state.code.toLowerCase()}.gov.au`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      >
                        Visit State Website
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {hasSearch && (
          <Card>
            <CardHeader>
              <CardTitle>State Comparison Table</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-semibold">State</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Min Points</th>
                    <th className="px-4 py-3 text-center font-semibold">Visas</th>
                    <th className="px-4 py-3 text-center font-semibold">Processing</th>
                    <th className="px-4 py-3 text-center font-semibold">Competition</th>
                  </tr>
                </thead>
                <tbody>
                  {categorizedStates.map(({ state, pointsSufficient }) => (
                    <tr
                      key={state.code}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        pointsSufficient
                          ? "bg-green-50/50 dark:bg-green-900/10"
                          : "bg-red-50/50 dark:bg-red-900/10"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {state.icon} {state.code}
                      </td>
                      <td className="px-4 py-3">
                        {state.offshoreAvailability === "open" ? (
                          <Badge className="bg-green-100 text-green-800">Open</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Closed</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={pointsSufficient ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          {state.minimumPointsGeneral}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {state.visaTypes.map((v) => v.code).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                        {state.processingTimeWeeks}w
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${getCompetitionColor(state.competitionLevel)}`}>
                          {competitionLabel(state.competitionLevel).split(" ")[0]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* FAQ Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <Card
                key={index}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() =>
                  setOpenFaqIndex(openFaqIndex === index ? null : index)
                }
              >
                <div className="flex items-center justify-between p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {item.question}
                  </h3>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${
                      openFaqIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {openFaqIndex === index && (
                  <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                    <p className="text-slate-600 dark:text-slate-300">{item.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 dark:border-indigo-800 dark:from-indigo-900/20 dark:to-purple-900/20">
          <CardContent className="space-y-4 pt-6 text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Want a complete assessment of your nomination chances?
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Get a detailed visa readiness report analyzing your points, state options, and next steps.
            </p>
            <Link href={`/${locale}/full-check`}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                Get Full Readiness Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
