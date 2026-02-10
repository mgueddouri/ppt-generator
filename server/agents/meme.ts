import { z } from "zod";
import { getLLM } from "../lib/llm";
import type { PresentationState } from "../lib/types";
import { generateMemeImage } from "../tools/images";

// 1. Schéma de sortie strict
const MemeOutputSchema = z.object({
  imageDescription: z.string().describe("Description détaillée pour DALL-E : personnages, expressions, décor."),
  topText: z.string().describe("Le texte d'accroche ou la situation (Setup)"),
  bottomText: z.string().describe("La chute ou la réaction (Punchline)")
});

type MemeOutput = z.infer<typeof MemeOutputSchema>;

const fallbackMemes: MemeOutput[] = [
  {
    imageDescription: "Un ingénieur fatigué devant 10 écrans affichant des erreurs, style cartoon.",
    topText: "Mettre en prod le vendredi à 17h",
    bottomText: "C'est le problème du futur moi"
  }
];

export async function runMeme(
  topic: string,
  slides: PresentationState["slides"]
): Promise<PresentationState["slides"]> {
  const llm = getLLM();
  const updated = [...slides] as PresentationState["slides"];
  const memeIndex = 3; // Index de la 4ème slide
  const slide = updated[memeIndex];
  
  if (!slide) return updated;

  // Si pas de LLM, on utilise un fallback immédiat
  if (!llm) {
    return applyMemeToSlide(updated, memeIndex, fallbackMemes[0]);
  }

  // 2. Configuration du LLM pour forcer le JSON propre
  const structuredLlm = llm.withStructuredOutput(MemeOutputSchema);

  const context = slides[1]?.title || topic;

  const prompt = `Tu es le Meme Lord, un développeur senior cynique et expert en culture web.
Sujet technique : "${topic}"
Contexte actuel : "${context}"

Ta mission : Concevoir une slide de meme (index 4) qui illustre une vérité douloureuse, une frustration ou une absurdité liée au sujet.

CONSIGNES :
1. Choisis un concept de meme classique (ex: 'This is Fine', 'Distracted Boyfriend', 'Clown applying makeup').
2. Le 'topText' doit être la punchline sarcastique
3. L' 'imageDescription' doit être un prompt visuel riche pour générer l'image.

Sois drôle, un peu piquant, et évite absolument l'humour "corporate" ennuyeux.`;

  try {
    // 3. Appel direct (plus de JSON.parse manuel !)
    const parsedMeme = await structuredLlm.invoke(prompt);
    return await applyMemeToSlide(updated, memeIndex, parsedMeme);
  } catch (error) {
    console.error("Échec du Meme Lord, utilisation du fallback technique.", error);
    const fallback = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
    return await applyMemeToSlide(updated, memeIndex, fallback);
  }
}

/**
 * Fonction utilitaire pour mettre à jour la slide et appeler le générateur d'image
 */
async function applyMemeToSlide(
  slides: PresentationState["slides"],
  index: number,
  memeData: MemeOutput
): Promise<PresentationState["slides"]> {
  const imageBase64 = await generateMemeImage(memeData);
  
  slides[index] = {
    ...slides[index],
    meme: { 
      ...memeData, 
      imageBase64: imageBase64 ?? undefined 
    },
    title: "Intermède Culturel", // Titre plus sympa que juste "Meme"
  };
  
  return slides;
}