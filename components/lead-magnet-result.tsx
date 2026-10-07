"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FORM_TEXT, pick, sentMessage } from "@/lib/lead-magnets";

/**
 * What a lead-magnet modal shows after a submission. Colours are explicit on every element (the app's light and dark themes share the same
 * pale background, so nothing here inherits white text): see scripts/test-lead-magnets.ts for the contrast ratios.
 *   sent           the provider accepted the email: "<file name> has been sent to <email>"
 *   not_delivered  the email was not sent: a localised notice and the download link on screen
 */
export function LeadMagnetResult({
  locale,
  fileName,
  email,
  state,
  onClose,
}: {
  locale: string;
  fileName: string;
  email: string;
  state: { kind: "sent" } | { kind: "not_delivered"; downloadUrl: string; suppressed: boolean };
  onClose?: () => void;
}) {
  if (state.kind === "sent") {
    return (
      <div className="space-y-4 py-4 text-center" role="status" data-lead-result="sent">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-800" aria-hidden="true" />
        </span>
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-950">
          {sentMessage(fileName, email, locale)}
        </p>
        <p className="text-sm text-slate-700">{pick(FORM_TEXT.checkInbox, locale)}</p>
        {onClose && (
          <Button onClick={onClose} className="w-full">
            {pick(FORM_TEXT.close, locale)}
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4 py-4 text-center" role="alert" data-lead-result="not_delivered">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <TriangleAlert className="h-8 w-8 text-amber-900" aria-hidden="true" />
      </span>
      <p className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-base font-semibold text-amber-950">
        {pick(state.suppressed ? FORM_TEXT.suppressed : FORM_TEXT.notDelivered, locale)}
      </p>
      <a
        href={state.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        data-lead-download
      >
        {pick(FORM_TEXT.download, locale)}: {fileName}
      </a>
      {onClose && (
        <Button variant="outline" onClick={onClose} className="w-full">
          {pick(FORM_TEXT.close, locale)}
        </Button>
      )}
    </div>
  );
}
