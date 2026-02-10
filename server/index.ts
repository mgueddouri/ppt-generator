import "dotenv/config";
import express from "express";
import cors from "cors";

import { buildGraph, createInitialState } from "./lib/graph";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/generated", express.static(new URL("../public/generated", import.meta.url).pathname));

app.post("/api/generate", async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
  if (!topic) {
    res.status(400).json({ error: "Sujet manquant." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const graph = buildGraph();
  let currentState = createInitialState(topic);

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
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
        if (mode === "custom" && payload?.type === "status") {
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

      if (chunk?.type === "status") {
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
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    send("error", { message });
    res.end();
  }
});

function extractUpdate(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  if ((payload as any).type === "status") return null;
  const values = Object.values(payload as Record<string, unknown>);
  if (values.length === 0) return null;
  const first = values[0];
  if (first && typeof first === "object") return first as Record<string, unknown>;
  return null;
}

const port = Number(process.env.PORT ?? 3001);
const key = process.env.OPENAI_API_KEY ?? "";
const keyPreview = key
  ? `prefix=${key.slice(0, 8)} suffix=${key.slice(-4)} len=${key.length}`
  : "missing";
console.log(`[env] OPENAI_API_KEY ${keyPreview}`);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
