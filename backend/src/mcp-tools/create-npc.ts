/**
 * MCP Tool: create_npc
 *
 * Creates a new NPC from a template or custom specifications.
 * Validates name uniqueness, parses templates from System.md,
 * and adds the NPC to state.
 *
 * Tool registered as: mcp__adventure-theme__create_npc
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { NPC, InventoryItem, NPCReward } from "../../../shared/protocol";
import type { SystemDefinition } from "../types/state";

/**
 * Result of creating an NPC
 */
export interface CreateNpcResult {
  success: true;
  npc: NPC;
  message: string;
  templateUsed: string | null;
}

/**
 * Error result from create_npc
 */
export interface CreateNpcError {
  success: false;
  error: string;
}

/**
 * Result type for createNpc function
 */
export type CreateNpcReturn = CreateNpcResult | CreateNpcError;

/**
 * Parameters for creating an NPC
 */
export interface CreateNpcParams {
  name: string;
  templateName?: string;
  stats?: Record<string, number>;
  skills?: Record<string, number>;
  hp?: { current: number; max: number };
  conditions?: string[];
  inventory?: InventoryItem[];
  reward?: NPCReward;
  isHostile?: boolean;
  notes?: string;
}

/**
 * Parsed NPC template from System.md
 */
interface ParsedTemplate {
  name: string;
  stats?: Record<string, number>;
  hp?: { current: number; max: number };
  isHostile?: boolean;
  notes?: string;
}

/**
 * Static tool definition for the create_npc tool.
 */
export const createNpcToolDefinition = {
  name: "create_npc",
  description: `Create a new NPC from a template or custom specifications.

If templateName is provided, defaults are extracted from the System.md NPC Templates section.
Parameter values override template defaults.

Examples:
- create_npc(name="Goblin Scout") → Creates NPC with name, no template
- create_npc(name="Goblin Scout", templateName="Goblin", hp={current:7,max:7})
- create_npc(name="Merchant Gorm", isHostile=false, notes="Sells potions")

Returns the created NPC with assigned UUID.`,
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Unique name for this NPC instance",
      },
      templateName: {
        type: "string",
        description: "Optional template name from System.md NPC Templates section",
      },
      stats: {
        type: "object",
        additionalProperties: { type: "number" },
        description: "Stat values (e.g., {strength: 10, dexterity: 14})",
      },
      skills: {
        type: "object",
        additionalProperties: { type: "number" },
        description: "Skill bonuses (e.g., {stealth: +4, perception: +2})",
      },
      hp: {
        type: "object",
        properties: {
          current: { type: "number" },
          max: { type: "number" },
        },
        required: ["current", "max"],
        description: "Hit points (current and maximum)",
      },
      conditions: {
        type: "array",
        items: { type: "string" },
        description: "Initial conditions (e.g., ['hidden', 'frightened'])",
      },
      inventory: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "number" },
          },
          required: ["name", "quantity"],
        },
        description: "Items carried by the NPC",
      },
      reward: {
        type: "object",
        properties: {
          xp: { type: "number" },
          loot: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
              },
            },
          },
          storyFlag: { type: "string" },
        },
        description: "Reward for overcoming this NPC",
      },
      isHostile: {
        type: "boolean",
        description: "Whether NPC is hostile to player (default: true)",
      },
      notes: {
        type: "string",
        description: "GM notes about this NPC",
      },
    },
    required: ["name"],
  },
} as const;

/**
 * Parse NPC templates from System.md content.
 * Looks for sections like "NPC Templates", "Monster Manual", "Creatures"
 * and extracts templates with their stats.
 */
export function parseNpcTemplates(rawContent: string): Map<string, ParsedTemplate> {
  const templates = new Map<string, ParsedTemplate>();

  // Find NPC-related sections
  const npcSectionPattern = /^(#{1,6})\s+(npc\s+templates?|monster\s+manual|creatures?|enemies)\s*$/im;
  const npcSectionMatch = npcSectionPattern.exec(rawContent);

  if (!npcSectionMatch) {
    return templates;
  }

  // Get the content after the NPC section header
  const sectionStart = npcSectionMatch.index + npcSectionMatch[0].length;
  const headerLevel = npcSectionMatch[1].length;

  // Find where this section ends (next section of same or higher level)
  const nextSectionPattern = new RegExp(`^#{1,${headerLevel}}\\s+[^#]`, "m");
  const remainingContent = rawContent.slice(sectionStart);
  const nextSectionMatch = nextSectionPattern.exec(remainingContent);
  const sectionContent = nextSectionMatch
    ? remainingContent.slice(0, nextSectionMatch.index)
    : remainingContent;

  // Parse individual templates (headings within the section)
  const templatePattern = /^(#{2,6})\s+(.+?)\s*$/gm;
  let templateMatch;

  while ((templateMatch = templatePattern.exec(sectionContent)) !== null) {
    const templateName = templateMatch[2].trim();
    const templateStart = templateMatch.index + templateMatch[0].length;

    // Find end of this template (next heading or end of section)
    const restOfSection = sectionContent.slice(templateStart);
    const nextHeading = /^#{2,6}\s+/m.exec(restOfSection);
    const templateContent = nextHeading
      ? restOfSection.slice(0, nextHeading.index)
      : restOfSection;

    // Parse template content for stats
    const template = parseTemplateContent(templateName, templateContent);
    templates.set(templateName.toLowerCase(), template);
  }

  return templates;
}

/**
 * Parse a single template's content for stats
 */
function parseTemplateContent(name: string, content: string): ParsedTemplate {
  const template: ParsedTemplate = { name };

  // Parse HP: look for "HP: X" or "HP X" patterns
  const hpMatch = /hp[:\s]+(\d+)(?:\/(\d+))?/i.exec(content);
  if (hpMatch) {
    const current = parseInt(hpMatch[1], 10);
    const max = hpMatch[2] ? parseInt(hpMatch[2], 10) : current;
    template.hp = { current, max };
  }

  // Parse basic stats (format: "Stat: value" or "Stat value")
  const stats: Record<string, number> = {};
  const statPatterns = [
    /strength[:\s]+(\d+)/i,
    /dexterity[:\s]+(\d+)/i,
    /constitution[:\s]+(\d+)/i,
    /intelligence[:\s]+(\d+)/i,
    /wisdom[:\s]+(\d+)/i,
    /charisma[:\s]+(\d+)/i,
    /attack[:\s]+([+-]?\d+)/i,
    /defense[:\s]+(\d+)/i,
    /armor[:\s]+(\d+)/i,
  ];

  for (const pattern of statPatterns) {
    const match = pattern.exec(content);
    if (match) {
      const statName = pattern.source.split("[")[0].toLowerCase();
      stats[statName] = parseInt(match[1], 10);
    }
  }

  if (Object.keys(stats).length > 0) {
    template.stats = stats;
  }

  // Default hostile unless content says otherwise
  template.isHostile = !/friendly|non-hostile|peaceful|neutral/i.test(content);

  // Use first line as notes if it doesn't look like a stat
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (!/^(hp|strength|dexterity|attack|defense)/i.test(firstLine)) {
      template.notes = firstLine;
    }
  }

  return template;
}

/**
 * Create a new NPC from params, optionally using a template
 */
export function createNpc(
  params: CreateNpcParams,
  existingNpcs: NPC[],
  systemDefinition: SystemDefinition | null
): CreateNpcReturn {
  // Validate name uniqueness (case-insensitive)
  const nameExists = existingNpcs.some(
    (npc) => npc.name.toLowerCase() === params.name.toLowerCase()
  );

  if (nameExists) {
    return {
      success: false,
      error: `NPC with name "${params.name}" already exists. Use update_npc to modify or choose a different name.`,
    };
  }

  // Start with template defaults if template name provided
  let templateDefaults: Partial<NPC> = {};
  let templateUsed: string | null = null;

  if (params.templateName && systemDefinition?.rawContent) {
    const templates = parseNpcTemplates(systemDefinition.rawContent);
    const template = templates.get(params.templateName.toLowerCase());

    if (template) {
      templateDefaults = {
        templateName: params.templateName,
        stats: template.stats,
        hp: template.hp,
        isHostile: template.isHostile,
        notes: template.notes,
      };
      templateUsed = template.name;
    } else {
      // Template not found - warn but continue with custom NPC
      templateDefaults = {
        templateName: params.templateName,
        notes: `[Template "${params.templateName}" not found in System.md]`,
      };
    }
  }

  // Build the NPC, with params overriding template defaults
  const npc: NPC = {
    id: randomUUID(),
    name: params.name,
    templateName: params.templateName ?? templateDefaults.templateName,
    stats: params.stats ?? templateDefaults.stats,
    skills: params.skills,
    hp: params.hp ?? templateDefaults.hp,
    conditions: params.conditions ?? [],
    inventory: params.inventory ?? [],
    reward: params.reward,
    isHostile: params.isHostile ?? templateDefaults.isHostile ?? true,
    notes: params.notes ?? templateDefaults.notes,
  };

  return {
    success: true,
    npc,
    message: templateUsed
      ? `Created NPC "${params.name}" from template "${templateUsed}"`
      : `Created NPC "${params.name}"`,
    templateUsed,
  };
}

/**
 * Format the create_npc result for display
 */
export function formatCreateNpcResult(result: CreateNpcReturn): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const { npc, message, templateUsed } = result;

  let output = `**${message}**\n\n`;
  output += `**ID**: ${npc.id}\n`;
  output += `**Name**: ${npc.name}\n`;

  if (templateUsed) {
    output += `**Template**: ${templateUsed}\n`;
  }

  if (npc.stats && Object.keys(npc.stats).length > 0) {
    output += `**Stats**: ${Object.entries(npc.stats)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")}\n`;
  }

  if (npc.skills && Object.keys(npc.skills).length > 0) {
    output += `**Skills**: ${Object.entries(npc.skills)
      .map(([k, v]) => `${k}: ${v >= 0 ? "+" : ""}${v}`)
      .join(", ")}\n`;
  }

  if (npc.hp) {
    output += `**HP**: ${npc.hp.current}/${npc.hp.max}\n`;
  }

  output += `**Hostile**: ${npc.isHostile ? "Yes" : "No"}\n`;

  if (npc.conditions && npc.conditions.length > 0) {
    output += `**Conditions**: ${npc.conditions.join(", ")}\n`;
  }

  if (npc.inventory && npc.inventory.length > 0) {
    output += `**Inventory**: ${npc.inventory.map((i) => `${i.name} (${i.quantity})`).join(", ")}\n`;
  }

  if (npc.reward) {
    const rewardParts: string[] = [];
    if (npc.reward.xp) rewardParts.push(`${npc.reward.xp} XP`);
    if (npc.reward.loot?.length) {
      rewardParts.push(`Loot: ${npc.reward.loot.map((l) => l.name).join(", ")}`);
    }
    if (npc.reward.storyFlag) rewardParts.push(`Flag: ${npc.reward.storyFlag}`);
    if (rewardParts.length > 0) {
      output += `**Reward**: ${rewardParts.join("; ")}\n`;
    }
  }

  if (npc.notes) {
    output += `**Notes**: ${npc.notes}\n`;
  }

  return output;
}

/**
 * Create the create_npc tool using the SDK's tool() helper.
 * @param getNpcs Function to get current NPCs array
 * @param addNpc Function to add NPC to state
 * @param getSystemDefinition Function to get system definition (for templates)
 */
export function createCreateNpcTool(
  getNpcs: () => NPC[],
  addNpc: (npc: NPC) => void,
  getSystemDefinition: () => SystemDefinition | null
) {
  return tool(
    "create_npc",
    `Create a new NPC from a template or custom specifications.
If templateName is provided, defaults are extracted from System.md NPC Templates.
Parameter values override template defaults. Returns created NPC with UUID.`,
    {
      name: z.string().describe("Unique name for this NPC instance"),
      templateName: z.string().optional().describe("Template name from System.md"),
      stats: z.record(z.number()).optional().describe("Stat values"),
      skills: z.record(z.number()).optional().describe("Skill bonuses"),
      hp: z
        .object({
          current: z.number(),
          max: z.number(),
        })
        .optional()
        .describe("Hit points"),
      conditions: z.array(z.string()).optional().describe("Initial conditions"),
      inventory: z
        .array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            equipped: z.boolean().optional(),
            properties: z.record(z.unknown()).optional(),
          })
        )
        .optional()
        .describe("Items carried"),
      reward: z
        .object({
          xp: z.number().optional(),
          loot: z
            .array(
              z.object({
                name: z.string(),
                quantity: z.number(),
                equipped: z.boolean().optional(),
                properties: z.record(z.unknown()).optional(),
              })
            )
            .optional(),
          storyFlag: z.string().optional(),
        })
        .optional()
        .describe("Reward for overcoming"),
      isHostile: z.boolean().optional().describe("Whether hostile"),
      notes: z.string().optional().describe("GM notes"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (args) => {
      const npcs = getNpcs();
      const systemDefinition = getSystemDefinition();

      const result = createNpc(args, npcs, systemDefinition);

      if (result.success) {
        addNpc(result.npc);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatCreateNpcResult(result),
          },
        ],
      };
    }
  );
}
