import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage, type UIMessageChunk } from "ai";

import type { Correction } from "./corrections";

/**
 * Forwards the model's UI message stream as it arrives (without its closing "finish"), and once the answer is
 * complete appends one data-correction part per correction to the SAME message, then closes the message. The client
 * keeps those parts with the message, so a correction is stored with, and shown under, the answer it corrects.
 */
export function correctedUIStreamResponse(chunks: AsyncIterable<UIMessageChunk>, correct?: (answer: string) => Correction[]): Response {
  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      let text = "";
      for await (const chunk of chunks) {
        if (chunk.type === "text-delta") text += chunk.delta;
        writer.write(chunk as never);
      }
      for (const correction of correct?.(text) ?? []) writer.write({ type: "data-correction", data: correction });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
