import { useMemo, useState } from "react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import type { PresentationState } from "./types";

interface LogEntry {
  agent: string;
  message: string;
  timestamp: string;
}

function timestampNow() {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export default function App() {
  const [topic, setTopic] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [state, setState] = useState<PresentationState | null>(null);
  const [loading, setLoading] = useState(false);

  const canGenerate = topic.trim().length > 3 && !loading;

  const slideTitles = useMemo(() => {
    if (!state) return [];
    return state.slides.map((slide, idx) => ({
      id: idx,
      title: slide.title || `Slide ${idx + 1}`,
      type: slide.type
    }));
  }, [state]);

  const appendLog = (entry: LogEntry) => {
    setLogs((prev) => [entry, ...prev]);
  };

  const handleEvent = (event: string, data: unknown) => {
    if (event === "status" && data && typeof data === "object") {
      const payload = data as { agent?: string; message?: string };
      appendLog({
        agent: payload.agent ?? "System",
        message: payload.message ?? "Mise a jour",
        timestamp: timestampNow()
      });
    }

    if (event === "state" && data && typeof data === "object") {
      const payload = data as PresentationState;
      setState(payload);
    }

    if (event === "error" && data && typeof data === "object") {
      const payload = data as { message?: string };
      appendLog({
        agent: "System",
        message: payload.message ?? "Erreur inconnue",
        timestamp: timestampNow()
      });
      setLoading(false);
    }

    if (event === "done") {
      setLoading(false);
    }
  };

  const startGeneration = async () => {
    setLogs([]);
    setState(null);
    setLoading(true);

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.trim() })
    });

    if (!response.body) {
      appendLog({
        agent: "System",
        message: "Streaming indisponible.",
        timestamp: timestampNow()
      });
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n");
        let event = "message";
        let dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            event = line.replace("event:", "").trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.replace("data:", "").trim());
          }
        }

        const dataString = dataLines.join("\n");
        if (!dataString) continue;
        try {
          const data = JSON.parse(dataString);
          handleEvent(event, data);
        } catch {
          handleEvent("status", { agent: "System", message: dataString });
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative mx-auto flex min-h-[45vh] max-w-6xl flex-col justify-center px-6 py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-200">
            MEETUP - YOMEVA x PARIS TYPESCRIPT - 10/02/2026
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
            Générateur de présentation
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-200">
            Orchestration LangGraph, redaction experte, meme slide sur mesure et
            export PPTX instantane.
          </p>
          <div className="mt-10 flex w-full max-w-3xl flex-col gap-4 rounded-3xl border border-ink-700/60 bg-ink-900/70 p-6 shadow-panel">
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ex: Orchestration multi-agent pour generation de PPTX"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={startGeneration} disabled={!canGenerate}>
                {loading ? "Generation en cours..." : "Generer 6 slides"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTopic("")}
                disabled={loading}
              >
                Reinitialiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-ink-700/60 bg-ink-900/70 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Agent Activity</h2>
            {loading && (
              <span className="rounded-full bg-ember-500/20 px-3 py-1 text-xs text-ember-400">
                En cours
              </span>
            )}
          </div>
          <div className="mt-4 h-[360px] overflow-y-auto rounded-2xl border border-ink-700/40 bg-ink-950/60 p-4">
            {logs.length === 0 ? (
              <p className="text-sm text-ink-400">
                Aucun log pour le moment. Lance une generation.
              </p>
            ) : (
              <ul className="space-y-3">
                {logs.map((log, idx) => (
                  <li key={`${log.timestamp}-${idx}`} className="text-sm">
                    <span className="text-ember-400">[{log.agent}]</span>{" "}
                    <span className="text-ink-100">{log.message}</span>
                    <span className="ml-2 text-xs text-ink-400">{log.timestamp}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-ink-700/60 bg-ink-900/70 p-6 shadow-panel">
          <h2 className="text-xl font-semibold">Preview</h2>
          <p className="mt-2 text-sm text-ink-300">
            Titres des 6 slides et acces au PPTX.
          </p>
          <div className="mt-4 space-y-3">
            {slideTitles.length === 0 ? (
              <div className="rounded-2xl border border-ink-700/40 bg-ink-950/60 p-4 text-sm text-ink-400">
                Les titres apparaitront ici apres generation.
              </div>
            ) : (
              <ul className="space-y-2">
                {slideTitles.map((slide) => (
                  <li
                    key={slide.id}
                    className="rounded-2xl border border-ink-700/40 bg-ink-950/60 p-3"
                  >
                    <p className="text-sm text-ink-300">{slide.type}</p>
                    <p className="text-base text-white">{slide.title}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {state?.downloadUrl ? (
              <Button asChild>
                <a href={state.downloadUrl}>Telecharger mon PowerPoint</a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Telecharger mon PowerPoint
              </Button>
            )}
            <p className="text-xs text-ink-400">
              Le fichier PPTX est genere cote serveur via PptxGenJS.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
