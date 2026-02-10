import { z } from "zod";
import { getLLM } from "../lib/llm";
import type { PresentationState } from "../lib/types";
import { generateMemeImage } from "../tools/images";

const MemeOutputSchema = z.object({
  imageDescription: z.string(),
  topText: z.string(),
  bottomText: z.string()
});

type MemeOutput = z.infer<typeof MemeOutputSchema>;

const fallbackMemes = [
  {
    imageDescription: "Drake Hotline Bling comparing manual slide creation vs automated multi-agent PPTX generation",
    topText: "Copier-coller des slides",
    bottomText: "Pipeline multi-agents + PptxGenJS"
  },
  {
    imageDescription: "Distracted Boyfriend: engineer ignoring old monolithic generator, looking at LangGraph multi-agent workflow",
    topText: "Générateur monolithique",
    bottomText: "Orchestration LangGraph"
  }
];

export async function runMeme(
  topic: string,
  slides: PresentationState["slides"]
): Promise<PresentationState["slides"]> {
  const llm = getLLM();
  const updated = [...slides] as PresentationState["slides"];
  const memeIndex = 3;
  const slide = updated[memeIndex];
  if (!slide) return updated;

  if (!llm) {
    const fallback = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
    const imageBase64 = await generateMemeImage(fallback);
    updated[memeIndex] = {
      ...slide,
      meme: { ...fallback, imageBase64: imageBase64 ?? undefined },
      title: slide.title || "Meme Time",
      angle: slide.angle || "Relacher la pression technique"
    };
    return updated;
  }

  const prompt = `Tu es le Meme Lord. Sujet: "${topic}".
Trouve un meme adaptee au sujet technique. Rends uniquement un JSON valide avec:
{"imageDescription":"...","topText":"...","bottomText":"..."}.
Pas de texte additionnel.`;

  const response = await llm.invoke(prompt);
  const raw = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  try {
    const parsed = MemeOutputSchema.parse(JSON.parse(raw));
    const imageBase64 = await generateMemeImage(parsed);
    updated[memeIndex] = {
      ...slide,
      meme: { ...parsed, imageBase64: imageBase64 ?? undefined },
      title: slide.title || "Meme"
    };
  } catch {
    const fallback = fallbackMemes[0];
    const imageBase64 = await generateMemeImage(fallback);
    updated[memeIndex] = {
      ...slide,
      meme: { ...fallback, imageBase64: imageBase64 ?? undefined },
      title: slide.title || "Meme"
    };
  }

  return updated;
}
