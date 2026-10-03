import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage, type UIMessageChunk } from "ai";

import type { Correction } from "./corrections";
import { InternalLabelStripper } from "./internal-labels";

/**
 * Forwards the model's UI message stream as it arrives (without its closing "finish"), and once the answer is
 * complete appends one data-correction part per correction to the SAME message, then closes the message. The client
 * keeps those parts with the message, so a correction is stored with, and shown under, the answer it corrects.
 * The opening summary (`lead`), when there is one to show, goes first, followed by a data-lead part with the profile's
 * fingerprint so the next request knows the summary was already shown.
 */
export function correctedUIStreamResponse(chunks: AsyncIterable<UIMessageChunk>, correct?: (answer: string) => Correction[], lead?: string, leadFingerprint?: string): Response {
  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      let text = "";
      let leadWritten = !lead;
      const writeLead = () => {
        if (leadWritten || !lead) return;
        leadWritten = true;
        writer.write({ type: "text-start", id: "lead" });
        writer.write({ type: "text-delta", id: "lead", delta: `${lead}\n\n` });
        writer.write({ type: "text-end", id: "lead" });
        // Marks this answer as the one that showed the summary for this profile (lib/chat/plan-summary.ts shouldShowLead).
        if (leadFingerprint) writer.write({ type: "data-lead", data: { fp: leadFingerprint } });
      };
      // Internal block ids (any form) never reach the stored message: the model's text is stripped as it streams.
      const strippers = new Map<string, InternalLabelStripper>();
      const stripperFor = (id: string) => strippers.get(id) ?? strippers.set(id, new InternalLabelStripper()).get(id)!;
      for await (const chunk of chunks) {
        // The engine's opening summary goes right after the message starts; the answer check sees only the model's text.
        if (chunk.type !== "start") writeLead();
        if (chunk.type === "text-delta") {
          text += chunk.delta; // the raw text: the check still reports what the model wrote
          const clean = stripperFor(chunk.id).push(chunk.delta);
          if (clean) writer.write({ ...chunk, delta: clean } as never);
          continue;
        }
        if (chunk.type === "text-end") {
          const rest = stripperFor(chunk.id).flush();
          if (rest) writer.write({ type: "text-delta", id: chunk.id, delta: rest } as never);
        }
        writer.write(chunk as never);
        if (chunk.type === "start") writeLead();
      }
      writeLead();
      for (const correction of correct?.(text) ?? []) writer.write({ type: "data-correction", data: correction });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
