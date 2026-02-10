import { z } from "zod";

export const SlideTypeSchema = z.enum([
  "intro",
  "explanation",
  "meme",
  "conclusion"
]);

export const MemeSchema = z.object({
  imageDescription: z.string(),
  imageBase64: z.string().optional(),
  topText: z.string(),
  bottomText: z.string()
});

export const SlideSchema = z.object({
  type: SlideTypeSchema,
  title: z.string(),
  angle: z.string(),
  bullets: z.array(z.string()).min(3).max(5).optional(),
  summary: z.string().optional(),
  meme: MemeSchema.optional()
});

export const SlidesSchema = z.tuple([
  SlideSchema.extend({ type: z.literal("intro") }),
  SlideSchema.extend({ type: z.literal("explanation") }),
  SlideSchema.extend({ type: z.literal("explanation") }),
  SlideSchema.extend({ type: z.literal("meme") }),
  SlideSchema.extend({ type: z.literal("conclusion") }),
  SlideSchema.extend({ type: z.literal("conclusion") })
]);

export const PresentationStateSchema = z.object({
  topic: z.string(),
  slides: SlidesSchema,
  downloadUrl: z.string().optional()
});

export type Slide = z.infer<typeof SlideSchema>;
export type PresentationState = z.infer<typeof PresentationStateSchema>;

export type SlideIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type WriterSlideIndex = 0 | 1 | 2 | 4 | 5;
export type MemeSlideIndex = 3;

export const slideOrder: Slide["type"][] = [
  "intro",
  "explanation",
  "explanation",
  "meme",
  "conclusion",
  "conclusion"
];

export function createEmptySlides(): PresentationState["slides"] {
  return [
    { type: "intro", title: "", angle: "" },
    { type: "explanation", title: "", angle: "" },
    { type: "explanation", title: "", angle: "" },
    { type: "meme", title: "", angle: "" },
    { type: "conclusion", title: "", angle: "" },
    { type: "conclusion", title: "", angle: "" }
  ];
}
