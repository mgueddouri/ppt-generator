import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";

import { runPlanner } from "../agents/planner";
import { runWriter } from "../agents/writer";
import { runMeme } from "../agents/meme";
import { generatePptx } from "../tools/pptx";
import { createEmptySlides, type PresentationState } from "../lib/types";

const PresentationAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  slides: Annotation<PresentationState["slides"]>(),
  downloadUrl: Annotation<string | undefined>()
});

export type PresentationGraphState = typeof PresentationAnnotation.State;

function writeStatus(config: RunnableConfig | undefined, payload: { agent: string; message: string }) {
  if (!config?.writer) return;
  try {
    config.writer({ type: "status", ...payload });
  } catch {
    // ignore streaming errors
  }
}

const plannerNode = async (state: PresentationGraphState, config?: RunnableConfig) => {
  writeStatus(config, {
    agent: "Architecte",
    message: "L'Architecte planifie la structure..."
  });
  const slides = await runPlanner(state.topic);
  return { slides };
};

const writerNode = async (state: PresentationGraphState, config?: RunnableConfig) => {
  writeStatus(config, {
    agent: "Expert",
    message: "L'Expert redige les slides cles..."
  });
  const slides = await runWriter(state.topic, state.slides);
  return { slides };
};

const memeNode = async (state: PresentationGraphState, config?: RunnableConfig) => {
  writeStatus(config, {
    agent: "Meme Lord",
    message: "Le Meme Lord cherche une punchline..."
  });
  const slides = await runMeme(state.topic, state.slides);
  return { slides };
};

const compilerNode = async (state: PresentationGraphState, config?: RunnableConfig) => {
  writeStatus(config, {
    agent: "Compilateur",
    message: "Le Compilateur genere le PPTX..."
  });
  const downloadUrl = await generatePptx({
    topic: state.topic,
    slides: state.slides,
    downloadUrl: state.downloadUrl
  });
  return { downloadUrl };
};

export function buildGraph() {
  return new StateGraph(PresentationAnnotation)
    .addNode("planner", plannerNode)
    .addNode("writer", writerNode)
    .addNode("meme", memeNode)
    .addNode("compiler", compilerNode)
    .addEdge(START, "planner")
    .addEdge("planner", "writer")
    .addEdge("writer", "meme")
    .addEdge("meme", "compiler")
    .addEdge("compiler", END)
    .compile();
}

export function createInitialState(topic: string): PresentationGraphState {
  return {
    topic,
    slides: createEmptySlides(),
    downloadUrl: undefined
  };
}
