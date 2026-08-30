"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addLeadNoteAction, type AddLeadNoteResult } from "@/lib/crm/notes-actions";
import type { LeadNoteWithAuthor } from "@/lib/crm/notes";

function roleLabel(role: string): string {
  if (role === "ADMIN") return "Admin";
  if (role === "AGENT") return "Agent";
  return role;
}

function formatTimestamp(date: Date, locale: string): string {
  return new Date(date).toLocaleString(locale);
}

export function LeadNotes({
  leadId,
  locale,
  initialNotes,
}: {
  leadId: string;
  locale: string;
  initialNotes: LeadNoteWithAuthor[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result: AddLeadNoteResult = await addLeadNoteAction(leadId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.note) {
        setNotes((prev) => [result.note!, ...prev]);
        setText("");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lead-note">Add a note</Label>
        <textarea
          id="lead-note"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Call notes, document status, next follow-up..."
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-white shadow-sm outline-none placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending || !text.trim()}>
          {isPending ? "Saving..." : "Add Note"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Activity</Label>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-400">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {roleLabel(note.author.role)} · {note.author.name ?? note.author.email} ·{" "}
                  {formatTimestamp(note.createdAt, locale)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-white">{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
