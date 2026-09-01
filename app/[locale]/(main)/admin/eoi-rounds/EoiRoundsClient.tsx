"use client";

import { useState, useTransition } from "react";
import { Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addEoiRound, deleteEoiRound } from "./actions";

type TierBreakdown = {
  gold?: number;
  green?: number;
  orangePlus?: number;
  orange?: number;
};

type EoiRound = {
  id: string;
  roundDate: Date;
  visaSubclass: string;
  visaName: string;
  lowestPoints: number | null;
  invitations: number;
  poolSize: number | null;
  notes: string | null;
  isEstimated: boolean;
  source: string;
  issuingAuthority: string;
  state: string | null;
  pathway: string | null;
  tierBreakdown: unknown;
};

function asTierBreakdown(value: unknown): TierBreakdown | null {
  if (!value || typeof value !== "object") return null;
  return value as TierBreakdown;
}

const STATE_OPTIONS = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const TASMANIA_PATHWAYS = ["TSE", "TSG", "TER", "TBO", "General"];

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SUBCLASS_NAMES: Record<string, string> = {
  "189": "Skilled Independent",
  "190": "Skilled Nominated",
  "491": "Skilled Work Regional",
};

export function EoiRoundsClient({
  locale,
  initialRounds,
}: {
  locale: string;
  initialRounds: EoiRound[];
}) {
  const [rounds, setRounds] = useState<EoiRound[]>(initialRounds);
  const [isPending, startTransition] = useTransition();

  // Form state
  const emptyFormData = {
    roundDate: "",
    visaSubclass: "189",
    lowestPoints: "",
    invitations: "",
    poolSize: "",
    notes: "",
    isEstimated: false,
    issuingAuthority: "FEDERAL",
    state: "",
    pathway: "",
    tierGold: "",
    tierGreen: "",
    tierOrangePlus: "",
    tierOrange: "",
  };
  const [formData, setFormData] = useState(emptyFormData);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddRound = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.roundDate || !formData.lowestPoints || !formData.invitations) {
      setMessage({ type: "error", text: "Fill in all required fields" });
      return;
    }

    if (formData.issuingAuthority === "STATE" && !formData.state) {
      setMessage({ type: "error", text: "Select a state" });
      return;
    }

    const hasTierInput =
      formData.state === "TAS" &&
      (formData.tierGold || formData.tierGreen || formData.tierOrangePlus || formData.tierOrange);

    startTransition(async () => {
      const result = await addEoiRound({
        roundDate: formData.roundDate,
        visaSubclass: formData.visaSubclass as "189" | "190" | "491",
        lowestPoints: Number(formData.lowestPoints),
        invitations: Number(formData.invitations),
        poolSize: formData.poolSize ? Number(formData.poolSize) : null,
        notes: formData.notes || null,
        isEstimated: formData.isEstimated,
        issuingAuthority: formData.issuingAuthority as "FEDERAL" | "STATE",
        state: formData.issuingAuthority === "STATE" ? (formData.state as never) : null,
        pathway: formData.issuingAuthority === "STATE" ? formData.pathway || null : null,
        tierBreakdown: hasTierInput
          ? {
              ...(formData.tierGold ? { gold: Number(formData.tierGold) } : {}),
              ...(formData.tierGreen ? { green: Number(formData.tierGreen) } : {}),
              ...(formData.tierOrangePlus ? { orangePlus: Number(formData.tierOrangePlus) } : {}),
              ...(formData.tierOrange ? { orange: Number(formData.tierOrange) } : {}),
            }
          : null,
      });

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setFormData(emptyFormData);
        // Refetch rounds
        location.reload();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this round?")) return;

    setDeleteLoading(id);
    startTransition(async () => {
      const result = await deleteEoiRound(id);
      setDeleteLoading(null);

      if (result.success) {
        setRounds((prev) => prev.filter((r) => r.id !== id));
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Round Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Round</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddRound} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Issuing Authority *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="issuingAuthority"
                    value="FEDERAL"
                    checked={formData.issuingAuthority === "FEDERAL"}
                    onChange={handleInputChange}
                  />
                  Federal
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="issuingAuthority"
                    value="STATE"
                    checked={formData.issuingAuthority === "STATE"}
                    onChange={handleInputChange}
                  />
                  State
                </label>
              </div>
            </div>

            {formData.issuingAuthority === "STATE" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">State *</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a state...</option>
                    {STATE_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Pathway (optional)</label>
                  {formData.state === "TAS" ? (
                    <select
                      name="pathway"
                      value={formData.pathway}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a pathway...</option>
                      {TASMANIA_PATHWAYS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      name="pathway"
                      value={formData.pathway}
                      onChange={handleInputChange}
                      placeholder="e.g. General"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Round Date *</label>
                <Input
                  type="date"
                  name="roundDate"
                  value={formData.roundDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Visa Subclass *</label>
                <select
                  name="visaSubclass"
                  value={formData.visaSubclass}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="189">189 - Skilled Independent</option>
                  <option value="190">190 - Skilled Nominated</option>
                  <option value="491">491 - Skilled Work Regional</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Lowest Points *</label>
                <Input
                  type="number"
                  name="lowestPoints"
                  min={50}
                  max={130}
                  value={formData.lowestPoints}
                  onChange={handleInputChange}
                  placeholder="e.g. 75"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Invitations *</label>
                <Input
                  type="number"
                  name="invitations"
                  min={1}
                  value={formData.invitations}
                  onChange={handleInputChange}
                  placeholder="e.g. 1000"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pool Size (optional)</label>
                <Input
                  type="number"
                  name="poolSize"
                  min={0}
                  value={formData.poolSize}
                  onChange={handleInputChange}
                  placeholder="e.g. 15000"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isEstimated"
                    checked={formData.isEstimated}
                    onChange={handleInputChange}
                    className="rounded border-input"
                  />
                  <span className="text-sm font-medium">Is Estimated</span>
                </label>
              </div>
            </div>

            {formData.state === "TAS" && (
              <div className="rounded-md border border-input p-4">
                <label className="mb-3 block text-sm font-semibold">Pass Tier Breakdown (Optional)</label>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Gold Invitations</label>
                    <Input
                      type="number"
                      name="tierGold"
                      min={0}
                      value={formData.tierGold}
                      onChange={handleInputChange}
                      placeholder="e.g. 17"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Green Invitations</label>
                    <Input
                      type="number"
                      name="tierGreen"
                      min={0}
                      value={formData.tierGreen}
                      onChange={handleInputChange}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Orange Plus Invitations</label>
                    <Input
                      type="number"
                      name="tierOrangePlus"
                      min={0}
                      value={formData.tierOrangePlus}
                      onChange={handleInputChange}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Orange Invitations</label>
                    <Input
                      type="number"
                      name="tierOrange"
                      min={0}
                      value={formData.tierOrange}
                      onChange={handleInputChange}
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any notes about this round..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {message && (
              <div
                className={`flex items-start gap-3 rounded-md p-3 ${
                  message.type === "success"
                    ? "border border-green-200 bg-green-50"
                    : "border border-red-200 bg-red-50"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <p
                  className={`text-sm ${message.type === "success" ? "text-green-800" : "text-red-800"}`}
                >
                  {message.text}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Round
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Rounds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Rounds ({rounds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No rounds recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Subclass</th>
                    <th className="px-4 py-3 font-semibold">State / Authority</th>
                    <th className="px-4 py-3 font-semibold text-right">Points</th>
                    <th className="px-4 py-3 font-semibold text-right">Invitations</th>
                    <th className="px-4 py-3 font-semibold text-right">Pool Size</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round) => (
                    <tr key={round.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(round.roundDate)}</td>
                      <td className="px-4 py-3 font-medium">{round.visaSubclass}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={round.issuingAuthority === "STATE" ? "secondary" : "outline"}>
                            {round.issuingAuthority === "STATE" ? round.state ?? "STATE" : "Federal"}
                          </Badge>
                          {round.pathway && (
                            <span className="text-xs text-muted-foreground">{round.pathway}</span>
                          )}
                          {round.state === "TAS" && asTierBreakdown(round.tierBreakdown) && (() => {
                            const tiers = asTierBreakdown(round.tierBreakdown)!;
                            return (
                              <>
                                {tiers.gold !== undefined && (
                                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                                    Gold: {tiers.gold}
                                  </span>
                                )}
                                {tiers.green !== undefined && (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                                    Green: {tiers.green}
                                  </span>
                                )}
                                {tiers.orangePlus !== undefined && (
                                  <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-900">
                                    Orange+: {tiers.orangePlus}
                                  </span>
                                )}
                                {tiers.orange !== undefined && (
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                                    Orange: {tiers.orange}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{round.lowestPoints ?? "Varies"}</td>
                      <td className="px-4 py-3 text-right">{round.invitations.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {round.poolSize?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {round.isEstimated ? (
                          <Badge variant="outline">Estimated</Badge>
                        ) : (
                          <Badge variant="default">Actual</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {round.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(round.id)}
                          disabled={deleteLoading === round.id}
                          className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete round"
                        >
                          {deleteLoading === round.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
