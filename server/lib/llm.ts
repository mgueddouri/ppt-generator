import { ChatOpenAI } from "@langchain/openai";

export function getLLM() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.4
  });
}
