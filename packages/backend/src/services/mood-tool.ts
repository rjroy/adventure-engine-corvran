import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
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

const SetMoodInputSchema = {
  description: z.string().min(1).max(500),
};

// Keyword-to-hue mapping table (REQ-MOOD-17). First match wins.
const KEYWORD_HUE_TABLE: Array<{ keywords: string[]; hue: number }> = [
  { keywords: ["fire", "flame", "inferno", "blaze", "burning"], hue: 25 },
  { keywords: ["blood", "rage", "anger", "fury", "wrath"], hue: 10 },
  { keywords: ["forest", "nature", "verdant", "grove", "woodland"], hue: 142 },
  { keywords: ["ocean", "sea", "water", "tide", "wave"], hue: 220 },
  { keywords: ["storm", "thunder", "lightning", "tempest"], hue: 250 },
  { keywords: ["shadow", "dark", "darkness", "gloom", "dread"], hue: 285 },
  { keywords: ["holy", "divine", "sacred", "celestial", "light"], hue: 85 },
  { keywords: ["ice", "frost", "frozen", "cold", "winter"], hue: 200 },
  { keywords: ["desert", "sand", "arid", "dust", "barren"], hue: 55 },
  { keywords: ["death", "undead", "necro", "corpse", "decay"], hue: 310 },
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

export function createMoodToolDef(deps: MoodToolDeps) {
  return tool(
    "set_mood",
    "Set the visual mood/atmosphere of the adventure. Call this when the scene's emotional tone shifts significantly.",
    SetMoodInputSchema,
    async (args) => {
      const prompt = deps.artStyle
        ? `${deps.artStyle}. ${args.description}`
        : args.description;

      const imageUrl = await deps.generateImage(prompt);

      if (imageUrl) {
        const moodImagePath = deps.adventurePath + "/mood.png";
        await deps.saveImage(imageUrl, moodImagePath);
        const hue = await deps.extractHue(moodImagePath);

        const mood: MoodState = { hue, description: args.description, imagePath: "mood.png" };
        await deps.setMood(mood);
        await deps.emitMoodEvent({ hue, description: args.description, imagePath: "mood.png" });

        return { content: [{ type: "text", text: "mood set" }] };
      }

      const hue = keywordHue(args.description);
      const mood: MoodState = { hue, description: args.description };
      await deps.setMood(mood);
      await deps.emitMoodEvent({ hue, description: args.description });

      return {
        content: [{ type: "text", text: "mood set (image generation failed \u2014 using fallback hue)" }],
      };
    },
  );
}
