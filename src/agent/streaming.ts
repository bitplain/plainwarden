export type AgentStreamEvent =
  | { type: "token"; text: string }
  | { type: "action"; payload: unknown }
  | { type: "navigate"; payload: { path: string } }
  | { type: "done" }
  | { type: "error"; message: string };

function encodeEvent(event: AgentStreamEvent): Uint8Array {
  const encoder = new TextEncoder();
  const lines = [`event: ${event.type}`, `data: ${JSON.stringify(event)}`, ""];
  return encoder.encode(`${lines.join("\n")}\n`);
}

export function streamTextChunks(text: string, chunkSize = 36): AgentStreamEvent[] {
  if (!text.trim()) {
    return [{ type: "token", text: "" }];
  }

  const chunks: AgentStreamEvent[] = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push({
      type: "token",
      text: text.slice(index, index + chunkSize),
    });
  }
  return chunks;
}

export function createSSEStream(events: AgentStreamEvent[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encodeEvent(event));
      }
      controller.close();
    },
  });
}

export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}
