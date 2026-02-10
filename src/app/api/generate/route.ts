import { buildGraph, createInitialState } from "@/lib/graph";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractUpdate(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if ("type" in payload && payload.type === "status") return null;

  const values = Object.values(payload);
  if (values.length === 0) return null;
  const first = values[0];
  if (isRecord(first)) return first as Record<string, unknown>;
  return null;
}

export async function POST(req: Request) {
  const body = await req.json();
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";

  if (!topic) {
    return new Response(JSON.stringify({ error: "Sujet manquant." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const encoder = new TextEncoder();
  const graph = buildGraph();
  let currentState = createInitialState(topic);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("status", { agent: "System", message: "Demarrage du workflow..." });

      try {
        const streamIterator = await graph.stream(currentState, {
          streamMode: ["updates", "custom"]
        } as any);

        for await (const chunk of streamIterator) {
          if (Array.isArray(chunk) && chunk.length >= 2) {
            const [maybeNs, maybeMode, maybePayload] = chunk as [unknown, unknown, unknown];
            const mode = chunk.length === 2 ? (maybeNs as string) : (maybeMode as string);
            const payload = chunk.length === 2 ? maybeMode : maybePayload;
            if (mode === "custom" && isRecord(payload) && payload.type === "status") {
              send("status", payload);
              continue;
            }
            if (mode === "updates") {
              const update = extractUpdate(payload);
              if (update) {
                currentState = { ...currentState, ...update };
                send("state", currentState);
              }
              continue;
            }
          }

          if (isRecord(chunk) && chunk.type === "status") {
            send("status", chunk);
            continue;
          }

          const update = extractUpdate(chunk);
          if (update) {
            currentState = { ...currentState, ...update };
            send("state", currentState);
          }
        }

        send("done", { message: "Generation terminee." });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        send("error", { message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
