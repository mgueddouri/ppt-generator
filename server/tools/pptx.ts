import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import pptxgen from "pptxgenjs";

import type { PresentationState } from "../lib/types";

export async function generatePptx(state: PresentationState): Promise<string> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  const slideW = 13.33;
  const slideH = 7.5;

  pptx.author = "AI PPTX Generator";
  pptx.company = "LangGraph Studio";
  pptx.subject = state.topic;

  const baseTitle = { fontFace: "Aptos Display", fontSize: 36, color: "FFFFFF" } as const;
  const baseBody = { fontFace: "Aptos", fontSize: 18, color: "E2E8F0" } as const;

  state.slides.forEach((slide) => {
    const s = pptx.addSlide();

    if (slide.type === "meme") {
      s.background = { fill: "1F2937" };
      s.addText(slide.title || "Meme", {
        x: 0.6,
        y: 0.4,
        w: 12.0,
        h: 0.6,
        fontFace: "Aptos Display",
        fontSize: 30,
        color: "FBBF24"
      });

      const meme = slide.meme;
      const top = meme?.topText ?? "Top Text";
      const bottom = meme?.bottomText ?? "Bottom Text";
      const desc = meme?.imageDescription ?? "Describe the meme image here";
      const imageBase64 = meme?.imageBase64;

      const marginX = 0.7;
      const marginY = 1.4;
      const imageSize = 4.6;
      const imageX = slideW - marginX - imageSize;
      const imageY = 1.6;

      s.addShape(pptx.ShapeType.rect, {
        x: imageX - 0.1,
        y: imageY - 0.1,
        w: imageSize + 0.2,
        h: imageSize + 0.2,
        fill: { color: "111827" },
        line: { color: "374151" }
      });

      if (imageBase64) {
        s.addImage({
          data: `data:image/png;base64,${imageBase64}`,
          x: imageX,
          y: imageY,
          w: imageSize,
          h: imageSize
        });
      } else {
        s.addText(`Image Description: ${desc}`, {
          x: imageX + 0.2,
          y: imageY + 0.2,
          w: imageSize - 0.4,
          h: imageSize - 0.4,
          fontFace: "Aptos",
          fontSize: 14,
          color: "D1D5DB"
        });
      }

      const textX = marginX;
      const textW = imageX - marginX - 0.4;

      s.addText(top, {
        x: textX,
        y: 2.0,
        w: textW,
        h: 0.8,
        fontFace: "Aptos Display",
        fontSize: 30,
        bold: true,
        color: "F87171"
      });

      s.addText(bottom, {
        x: textX,
        y: 3.3,
        w: textW,
        h: 0.8,
        fontFace: "Aptos Display",
        fontSize: 30,
        bold: true,
        color: "F87171"
      });

      return;
    }

    s.background = { fill: "0F172A" };
    s.addText(slide.title || "Untitled", {
      x: 0.6,
      y: 0.5,
      w: 12.2,
      h: 0.7,
      ...baseTitle
    });

    const bullets = slide.bullets ?? [];
    const bulletText = bullets.length ? bullets.map((b) => `• ${b}`).join("\n") : "";
    s.addText(bulletText, {
      x: 0.8,
      y: 1.5,
      w: 12.0,
      h: 3.2,
      ...baseBody
    });

    if (slide.summary) {
      s.addText(slide.summary, {
        x: 0.8,
        y: 4.9,
        w: 12.0,
        h: 0.9,
        fontFace: "Aptos",
        fontSize: 16,
        color: "CBD5F5"
      });
    }
  });

  const rootDir = fileURLToPath(new URL("../../", import.meta.url));
  const outputDir = path.join(rootDir, "public", "generated");
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `presentation-${Date.now()}.pptx`;
  const filepath = path.join(outputDir, filename);

  await pptx.writeFile({ fileName: filepath });

  return `/generated/${filename}`;
}
