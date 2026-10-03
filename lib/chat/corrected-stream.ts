import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage, type UIMessageChunk } from "ai";

import type { Correction } from "./corrections";

/**
 * Forwards the model's UI message stream as it arrives (without its closing "finish"), and once the answer is
 * complete appends one data-correction part per correction to the SAME message, then closes the message. The client
 * keeps those parts with the message, so a correction is stored with, and shown under, the answer it corrects.
 */
export function correctedUIStreamResponse(chunks: AsyncIterable<UIMessageChunk>, correct?: (answer: string) => Correction[], lead?: string): Response {
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
      };
      for await (const chunk of chunks) {
        // The engine's opening summary goes right after the message starts; the answer check sees only the model's text.
        if (chunk.type !== "start") writeLead();
        if (chunk.type === "text-delta") text += chunk.delta;
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
