"use client";

import { useState, useTransition } from "react";
import { Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addEoiRound, deleteEoiRound } from "./actions";

type EoiRound = {
  id: string;
  roundDate: Date;
  visaSubclass: string;
  visaName: string;
  lowestPoints: number;
  invitations: number;
  poolSize: number | null;
  notes: string | null;
  isEstimated: boolean;
  source: string;
};

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
  const [formData, setFormData] = useState({
    roundDate: "",
    visaSubclass: "189",
    lowestPoints: "",
    invitations: "",
    poolSize: "",
    notes: "",
    isEstimated: false,
  });
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

    startTransition(async () => {
      const result = await addEoiRound({
        roundDate: formData.roundDate,
        visaSubclass: formData.visaSubclass,
        lowestPoints: Number(formData.lowestPoints),
        invitations: Number(formData.invitations),
        poolSize: formData.poolSize ? Number(formData.poolSize) : null,
        notes: formData.notes || null,
        isEstimated: formData.isEstimated,
      });

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setFormData({
          roundDate: "",
          visaSubclass: "189",
          lowestPoints: "",
          invitations: "",
          poolSize: "",
          notes: "",
          isEstimated: false,
        });
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
                      <td className="px-4 py-3 text-right font-semibold">{round.lowestPoints}</td>
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
