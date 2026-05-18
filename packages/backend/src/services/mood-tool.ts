import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { MoodState } from "@corvran/shared";

export interface MoodEventPayload {
  hue: number;
  description: string;
  imagePath?: string;
}

export interface MoodToolDeps {
  adventureId: string;
  adventurePath: string;
  artStyle: string | null;
  generateImage: (prompt: string) => Promise<string | null>;
  extractHue: (imagePath: string) => Promise<number>;
  saveImage: (url: string, destPath: string) => Promise<void>;
  setMood: (mood: MoodState) => Promise<void>;
  emitMoodEvent: (payload: MoodEventPayload) => Promise<void>;
}

const SetMoodInputSchema = Type.Object({
  description: Type.String({ minLength: 1, maxLength: 500 }),
});

// Keyword-to-hue mapping table (REQ-MOOD-17). First match wins.
const KEYWORD_HUE_TABLE: Array<{ keywords: string[]; hue: number }> = [
  { keywords: ["fire", "flame", "lava", "ember", "inferno", "burning"], hue: 20 },
  { keywords: ["blood", "crimson", "war", "rage"], hue: 5 },
  { keywords: ["forest", "tree", "moss", "vine", "growth", "verdant"], hue: 142 },
  { keywords: ["ocean", "sea", "water", "river", "tide"], hue: 220 },
  { keywords: ["sky", "air", "wind", "dawn", "sunrise", "morning"], hue: 195 },
  { keywords: ["night", "void", "darkness", "shadow", "abyss"], hue: 270 },
  { keywords: ["ice", "snow", "frost", "tundra", "glacier"], hue: 205 },
  { keywords: ["desert", "sand", "stone", "ruin", "ancient"], hue: 50 },
  { keywords: ["magic", "arcane", "mystical", "ethereal", "fey"], hue: 300 },
  { keywords: ["poison", "plague", "decay", "rot", "corruption"], hue: 120 },
];

export function keywordHue(description: string): number {
  const lower = description.toLowerCase();
  for (const group of KEYWORD_HUE_TABLE) {
    for (const keyword of group.keywords) {
      if (lower.includes(keyword)) {
        return group.hue;
      }
    }
  }
  return 270;
}

export function createMoodToolDef(deps: MoodToolDeps): ToolDefinition {
  return defineTool({
    name: "set_mood",
    label: "Set Mood",
    description:
      "Set the visual mood/atmosphere of the adventure. Call this when the scene's emotional tone shifts significantly.",
    parameters: SetMoodInputSchema,
    async execute(_toolCallId, args) {
      console.log(`[mood-tool] ${deps.adventureId}: invoked with description="${args.description}"`);

      const prompt = deps.artStyle
        ? `${deps.artStyle}. ${args.description}`
        : args.description;

      const imageUrl = await deps.generateImage(prompt);
      let hue: number;
      let imagePath: string | undefined;

      if (imageUrl) {
        const moodImageDest = deps.adventurePath + "/mood.png";
        let imageSaved = false;
        try {
          await deps.saveImage(imageUrl, moodImageDest);
          imageSaved = true;
          console.log(`[mood-tool] ${deps.adventureId}: image saved to ${moodImageDest}`);
        } catch (err) {
          console.error(`[mood-tool] ${deps.adventureId}: failed to save image:`, err);
        }

        if (imageSaved) {
          try {
            hue = await deps.extractHue(moodImageDest);
            imagePath = "mood.png";
            console.log(`[mood-tool] ${deps.adventureId}: extracted hue=${hue} from image`);
          } catch (err) {
            console.warn(`[mood-tool] ${deps.adventureId}: hue extraction failed, using keyword fallback:`, err);
          }
        }
      } else {
        console.log(`[mood-tool] ${deps.adventureId}: image generation returned null, using keyword fallback`);
      }

      // Fall back to keyword hue if we don't have one from the image
      hue ??= keywordHue(args.description);
      console.log(`[mood-tool] ${deps.adventureId}: final hue=${hue}, imagePath=${imagePath ?? "none"}`);

      const mood: MoodState = imagePath
        ? { hue, description: args.description, imagePath }
        : { hue, description: args.description };

      try {
        await deps.setMood(mood);
        console.log(`[mood-tool] ${deps.adventureId}: mood persisted to adventure.md`);
      } catch (err) {
        console.error(`[mood-tool] ${deps.adventureId}: failed to persist mood:`, err);
      }

      try {
        const eventPayload: MoodEventPayload = { hue, description: args.description };
        if (imagePath) eventPayload.imagePath = imagePath;
        await deps.emitMoodEvent(eventPayload);
        console.log(`[mood-tool] ${deps.adventureId}: mood event emitted`);
      } catch (err) {
        console.error(`[mood-tool] ${deps.adventureId}: failed to emit mood event:`, err);
      }

      const status = imagePath ? "mood set" : "mood set (using fallback hue)";
      return {
        content: [{ type: "text", text: status }],
        details: { hue, description: args.description, imagePath },
      };
    },
  });
}
