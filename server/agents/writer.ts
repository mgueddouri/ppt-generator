import { z } from "zod";
import { getLLM } from "../lib/llm";
import type { PresentationState, WriterSlideIndex } from "../lib/types";

// 1. Schéma de sortie strict
const WriterOutputSchema = z.object({
  bullets: z.array(z.string()).min(3).max(5),
  summary: z.string()
});

const writerIndices: WriterSlideIndex[] = [0, 1, 2, 4, 5];

export async function runWriter(
  topic: string,
  slides: PresentationState["slides"]
): Promise<PresentationState["slides"]> {
  const llm = getLLM();
  if (!llm) return slides;

  // 2. ON FORCE LA SORTIE STRUCTURÉE (Magie LangChain)
  // Cela élimine 99% des erreurs de parsing JSON
  const structuredLlm = llm.withStructuredOutput(WriterOutputSchema);

  // 3. Traitement en parallèle pour la vitesse
  const promises = slides.map(async (slide, index) => {
    // Si ce n'est pas un index géré par le writer (ex: le meme à l'index 3), on passe
    if (!writerIndices.includes(index as WriterSlideIndex)) {
      return slide;
    }

    const prompt = `Tu es un Expert Senior en ${topic}. 
Sujet : "${topic}"
Slide : "${slide.title}"
Angle technique à démontrer : "${slide.angle}"

CONSIGNES DE RÉDACTION :
- Interdiction d'utiliser du jargon marketing (innovant, solution, etc.).
- Utilise des termes techniques précis et des faits concrets.
- Chaque point doit être une information dense.
- Langue : Français.`;

    try {
      // 4. Appel direct : plus besoin de JSON.parse manuel !
      const result = await structuredLlm.invoke(prompt);
      
      return { 
        ...slide, 
        bullets: result.bullets, 
        summary: result.summary 
      };
    } catch (err) {
      console.error(`Erreur sur slide ${index}:`, err);
      // Fallback uniquement si l'API est crashée
      return { ...slide, ...fallbackWriter(slide.title, slide.angle) };
    }
  });

  return await Promise.all(promises) as PresentationState["slides"];
}

function fallbackWriter(title: string, angle: string) {
  return {
    bullets: [
      `Analyse de la problématique : ${title}`,
      `Focus technique sur l'angle : ${angle}`,
      "Mise en œuvre des standards industriels",
      "Évaluation des contraintes et performances"
    ],
    summary: `Synthèse technique de l'aspect ${title}.`
  };
}