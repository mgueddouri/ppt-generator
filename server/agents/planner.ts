import { z } from "zod";
import { getLLM } from "../lib/llm";
import { SlidesSchema, createEmptySlides, type PresentationState } from "../lib/types";

// On réutilise ton SlidesSchema pour la validation finale
const PlannerSchema = SlidesSchema;

export async function runPlanner(topic: string): Promise<PresentationState["slides"]> {
  const llm = getLLM();
  
  if (!llm) return generateFallback(topic);

  // Configuration de l'extraction structurée basée sur ton SlidesSchema
  // On passe le schéma directement pour que le LLM renvoie le tableau d'objets
  const structuredLlm = llm.withStructuredOutput(PlannerSchema);

  const prompt = `Tu es un Expert en Stratégie et Communication. 
Sujet : "${topic}".

Ta mission est de structurer un argumentaire PERCUTANT en 6 slides. 
Ne fais pas de généralités. Chaque slide doit apporter une information concrète ou une opinion forte.

Respecte cet ordre :
1. intro : Pose un constat alarmant ou un défi majeur lié à ${topic}.
2. explanation : Détaille la mécanique technique interne n°1 (le "Comment ça marche").
3. explanation : Analyse un cas d'usage complexe ou une optimisation avancée.
4. meme : Une critique ironique d'une erreur commune sur ce sujet.
5. conclusion : Solution concrète et métriques de succès (ROI, performance, etc.).
6. conclusion : La vision futuriste ou le prochain grand changement.

Pour chaque slide, l' 'angle' doit être une consigne précise de ce qu'il faut prouver.`;

  try {
    // L'invocation renvoie directement le tableau typé grâce à withStructuredOutput
    const slides = await structuredLlm.invoke(prompt);
    
    // Sécurité supplémentaire : on s'assure qu'on a bien 6 slides
    if (slides.length !== 6) {
      throw new Error("Nombre de slides incorrect");
    }

    return slides;
  } catch (error) {
    console.error("Échec du Planner, passage au fallback dynamique...");
    return generateFallback(topic);
  }
}

/**
 * Fallback amélioré pour rester cohérent avec le sujet 
 * même en cas de panne de l'IA
 */
function generateFallback(topic: string): PresentationState["slides"] {
  const empty = createEmptySlides(); // Utilise ta fonction utilitaire
  const typesMap = [
    "Introduction au sujet",
    "Premier pilier technique",
    "Approfondissement et détails",
    "Interlude humoristique",
    "Synthèse des points clés",
    "Conclusion et perspectives"
  ];

  return empty.map((slide, idx) => ({
    ...slide,
    title: `${typesMap[idx]} : ${topic}`,
    angle: `Exploration de l'aspect ${typesMap[idx]?.toLowerCase()}.`
  })) as PresentationState["slides"];
}