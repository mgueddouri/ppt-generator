 # AI PPTX Generator - Architecture Technique

## Objectif
Ce projet génère une présentation PowerPoint à partir d'un sujet. Il orchestre plusieurs agents (planification, rédaction, meme) via LangGraph, puis compile un fichier `.pptx` avec PptxGenJS. Le client reçoit l'état en streaming (SSE) et affiche l'activité des agents en temps réel.

## Vue d'ensemble (runtime)
1. UI (Vite, React) envoie un `POST /api/generate` avec le sujet.
2. Le serveur Express lance un workflow LangGraph (4 nœuds).
3. Les agents produisent un état de présentation (6 slides) + un meme.
4. Le compilateur génère un `.pptx` dans `public/generated`.
5. Le serveur stream des événements SSE (`status`, `state`, `done`) vers l'UI.

## Composants principaux
### Client (Vite)
- Entrée principale: `src/App.tsx`.
- UI: `src/components/ui/*`.
- Modèle de données côté client: `src/types.ts`.
- Streaming SSE: parser basique côté client (lecture `ReadableStream`).
- Affichage des logs d'agents: "Agent Activity".

### Serveur (Express + LangGraph)
- Entrée serveur: `server/index.ts`.
- API: `POST /api/generate` (SSE).
- Orchestration: `server/lib/graph.ts` (StateGraph LangGraph).
- Types et schémas: `server/lib/types.ts` (Zod).
- LLM: `server/lib/llm.ts` (ChatOpenAI via @langchain/openai).
- Agents:
  - `server/agents/planner.ts` (Architecte) -> structure des 6 slides.
  - `server/agents/writer.ts` (Expert) -> bullets + summary.
  - `server/agents/meme.ts` (Meme Lord) -> texte du meme + image.
- Outils:
  - `server/tools/images.ts` -> appel OpenAI Images API (DALL·E).
  - `server/tools/pptx.ts` -> génération PPTX via PptxGenJS.

### Next.js (optionnel, non utilisé par `npm run dev`)
- Pages UI: `src/app/page.tsx`.
- API route SSE: `src/app/api/generate/route.ts`.
- Cette route réutilise l'orchestration LangGraph, mais n'est pas démarrée par le script `dev` actuel.

## Flux de données détaillé
### 1) Entrée utilisateur
- L'utilisateur saisit un sujet.
- `src/App.tsx` envoie `POST /api/generate` avec `{ topic }`.

### 2) SSE côté serveur
- `server/index.ts` ouvre un flux SSE:
  - `status`: messages d'agents (progression).
  - `state`: état de la présentation (slides, downloadUrl).
  - `done`: fin de workflow.
- L'UI lit le stream et alimente l'activité des agents + l'aperçu.

### 3) LangGraph (StateGraph)
- Définition dans `server/lib/graph.ts`.
- Ordre des nœuds:
  1. `planner` -> `runPlanner`
  2. `writer` -> `runWriter`
  3. `meme` -> `runMeme`
  4. `compiler` -> `generatePptx`
- Chaque nœud émet un `status` via `config.writer(...)`.

### 4) Production de contenu
- `planner` génère la structure 6 slides: intro, explanation, explanation, meme, conclusion, conclusion.
- `writer` enrichit les slides (sauf meme) avec bullets + summary.
- `meme` génère description d'image + top/bottom text, puis appelle l'outil image.
- Si LLM indisponible (clé absente), des fallbacks déterministes sont utilisés.

### 5) Génération PPTX
- `server/tools/pptx.ts` transforme l'état en slides PptxGenJS.
- Fichier écrit dans `public/generated/presentation-<timestamp>.pptx`.
- URL renvoyée: `/generated/<filename>`.

## Modèle de données (state)
Défini dans `server/lib/types.ts` (Zod) et `src/types.ts` (TS).
- `PresentationState`:
  - `topic: string`
  - `slides: [Slide x6]`
  - `downloadUrl?: string`
- `Slide`:
  - `type: "intro" | "explanation" | "meme" | "conclusion"`
  - `title: string`
  - `angle: string`
  - `bullets?: string[]`
  - `summary?: string`
  - `meme?: { imageDescription, imageBase64?, topText, bottomText }`

## Streaming et logs d'agents
- Les statuts sont envoyés via le stream `custom` de LangGraph.
- Le serveur convertit ces statuts en événements SSE `status`.
- L'UI les affiche dans "Agent Activity".

## Dépendances clés
- `@langchain/langgraph`: orchestration d'agents.
- `@langchain/openai`: LLM ChatOpenAI.
- `openai`: client OpenAI (images).
- `pptxgenjs`: génération PPTX.
- `express`: API SSE.
- `zod`: validation stricte des sorties LLM.
- `vite`, `react`: front.

## Configuration & environnement
Variables d'environnement (fichier `.env`):
- `OPENAI_API_KEY`: clé OpenAI (obligatoire pour LLM + images).
- `OPENAI_MODEL`: défaut `gpt-4o-mini`.
- `OPENAI_IMAGE_MODEL`: défaut `dall-e-3`.

Ports:
- UI Vite: `http://localhost:3000`
- API Express: `http://localhost:3001`
- Proxy Vite: `/api -> http://localhost:3001`

## Scripts
- `npm run dev`: Vite + serveur Express.
- `npm run server`: serveur Express seul.
- `npm run build`: build Vite.
- `npm run preview`: preview Vite.

## Répertoires
- `server/`: backend Express, LangGraph, agents, outils PPTX/images.
- `src/`: frontend Vite et dossier `app/` Next (optionnel).
- `public/generated/`: sorties `.pptx` générées.

## Points d'extension
- Ajouter des agents dans `server/agents/*` et les chaîner dans `server/lib/graph.ts`.
- Modifier le template PPTX dans `server/tools/pptx.ts`.
- Brancher une autre source d'images dans `server/tools/images.ts`.
- Ajouter un mode de streaming supplémentaire (ex: `debug`, `messages`) côté serveur.
