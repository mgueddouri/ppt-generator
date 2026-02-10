export type SlideType = "intro" | "explanation" | "meme" | "conclusion";

export interface MemeData {
  imageDescription: string;
  imageBase64?: string;
  topText: string;
  bottomText: string;
}

export interface Slide {
  type: SlideType;
  title: string;
  angle: string;
  bullets?: string[];
  summary?: string;
  meme?: MemeData;
}

export interface PresentationState {
  topic: string;
  slides: [Slide, Slide, Slide, Slide, Slide, Slide];
  downloadUrl?: string;
}
