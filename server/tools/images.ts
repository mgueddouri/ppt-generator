import { MemeSchema } from "../lib/types";
import { z } from "zod";

const ImageResponseSchema = z.object({
  data: z.array(
    z.object({
      b64_json: z.string().optional(),
      url: z.string().optional()
    })
  )
});

type ImageResponse = z.infer<typeof ImageResponseSchema>;

type MemeInput = Pick<z.infer<typeof MemeSchema>, "imageDescription" | "topText" | "bottomText">;

export async function generateMemeImage(input: MemeInput): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `${input.imageDescription}. Style: meme-friendly, high-contrast, no text in the image, leave space at top and bottom for captions.`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as ImageResponse;
  const parsed = ImageResponseSchema.safeParse(json);
  if (!parsed.success) return null;
  const first = parsed.data.data[0];
  return first?.b64_json ?? null;
}
