"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { addVisaTracking, updateVisaTracking, deleteVisaTracking } from "../actions";
import { VISA_TRACKING_STATUSES, type VisaTrackingStatus } from "../types";

type TrackingItem = {
  id: string;
  visa_subclass: string;
  status: string;
  notes: string | null;
  target_date: string | null;
  created_at: Date | null;
};

const STATUS_META: Record<VisaTrackingStatus, { label: string; color: string; bg: string }> = {
  planning: { label: "Planning", color: "text-slate-600", bg: "bg-slate-100" },
  preparing: { label: "Preparing", color: "text-blue-700", bg: "bg-blue-100" },
  submitted: { label: "Submitted", color: "text-violet-700", bg: "bg-violet-100" },
  waiting: { label: "Waiting", color: "text-amber-700", bg: "bg-amber-100" },
  approved: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-100" },
  rejected: { label: "Rejected", color: "text-rose-700", bg: "bg-rose-100" },
};

const VISA_SUBCLASSES = [
  "189", "190", "491", "482", "485", "500", "820/801", "186", "187",
];

const STATUS_ORDER: VisaTrackingStatus[] = [
  "planning", "preparing", "submitted", "waiting", "approved", "rejected",
];

function nextStatus(current: string): VisaTrackingStatus | null {
  const idx = STATUS_ORDER.indexOf(current as VisaTrackingStatus);
  if (idx < 0 || idx >= STATUS_ORDER.length - 2) return null;
  return STATUS_ORDER[idx + 1];
}

export function VisaTrackerClient({ items }: { items: TrackingItem[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [subclass, setSubclass] = useState("");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function handleAdd() {
    if (!subclass.trim()) return;
    startTransition(async () => {
      await addVisaTracking({ visaSubclass: subclass, notes, targetDate });
      setSubclass("");
      setNotes("");
      setTargetDate("");
      setShowForm(false);
    });
  }

  function handleAdvance(id: string, current: string) {
    const next = nextStatus(current);
    if (!next) return;
    startTransition(() => updateVisaTracking(id, { status: next }));
  }

  function handleDelete(id: string) {
    startTransition(() => deleteVisaTracking(id));
  }

  const grouped = STATUS_ORDER.reduce<Record<string, TrackingItem[]>>(
    (acc, s) => {
      acc[s] = items.filter((i) => i.status === s);
      return acc;
    },
    {} as Record<string, TrackingItem[]>
  );

  return (
    <div className="space-y-6">
      {/* Add form */}
      {showForm ? (
        <Card className="border-indigo-100">
          <CardHeader>
            <CardTitle className="text-sm">Add a Visa to Track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Visa Subclass *
              </label>
              <select
                value={subclass}
                onChange={(e) => setSubclass(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select subclass…</option>
                {VISA_SUBCLASSES.map((v) => (
                  <option key={v} value={v}>
                    Subclass {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Target Date (optional)
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Notes (optional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Submitted ACS assessment in March"
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!subclass || pending} size="sm">
                Add Visa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Track a New Visa
        </Button>
      )}

      {/* Kanban columns */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-semibold text-slate-700">No visas tracked yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Add a visa above to track your progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            const statusItems = grouped[status] ?? [];
            if (statusItems.length === 0) return null;
            return (
              <div key={status}>
                <div className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 ${meta.bg}`}>
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className={`ml-auto text-xs font-bold ${meta.color}`}>
                    {statusItems.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {statusItems.map((item) => {
                    const next = nextStatus(item.status);
                    return (
                      <Card key={item.id} className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                Subclass {item.visa_subclass}
                              </p>
                              {item.target_date && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Target: {new Date(item.target_date).toLocaleDateString("en-AU")}
                                </p>
                              )}
                              {item.notes && (
                                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={pending}
                              className="shrink-0 rounded p-1 text-slate-300 transition hover:text-rose-400"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {next && (
                            <button
                              type="button"
                              onClick={() => handleAdvance(item.id, item.status)}
                              disabled={pending}
                              className={`mt-3 flex w-full items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 ${STATUS_META[next].bg} ${STATUS_META[next].color}`}
                            >
                              Move to {STATUS_META[next].label}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
