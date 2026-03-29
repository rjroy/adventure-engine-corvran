import { NextRequest, NextResponse } from "next/server";

/**
 * Temporary mock API returning hardcoded JSON for GET endpoints
 * and simulated SSE for POST message. Replaced by real proxy in Phase 5.
 */

const MOCK_ADVENTURES = [
  {
    id: "lost-mines",
    name: "Lost Mines of Phandelver",
    hasCharacter: true,
    hasWorld: true,
    hasHistory: true,
  },
  {
    id: "thornwood-descent",
    name: "Thornwood Descent",
    hasCharacter: true,
    hasWorld: false,
    hasHistory: true,
  },
  {
    id: "freeform-narrative",
    name: "freeform-narrative",
    hasCharacter: false,
    hasWorld: false,
    hasHistory: false,
  },
];

const MOCK_HISTORY = `**Player:** I approach the pedestal carefully and try to read the runes. Does my character have Arcana proficiency?

**GM:** Thorin Ironforge, you peer at the runes, drawing on your years in the mountain libraries. Let's see how well your Arcana training serves you here.

The runes resolve into meaning: a warning, in old Dwarvish. *"Speak the keeper's name or face the warden's fire."*

**Player:** I step back from the pedestal and examine the chest with the black lock more closely.

**GM:** You crouch beside the third chest. Up close, the "lock" reveals itself to be no lock at all — it's a sealed mouth, carved in stone, lips pressed tight. No keyhole. No visible mechanism.`;

function matchPath(segments: string[]): {
  handler: string;
  params: Record<string, string>;
} | null {
  // GET /adventures
  if (segments.length === 1 && segments[0] === "adventures") {
    return { handler: "listAdventures", params: {} };
  }
  // GET /adventures/:id
  if (segments.length === 2 && segments[0] === "adventures") {
    return { handler: "getAdventure", params: { id: segments[1] } };
  }
  // GET /adventures/:id/history
  if (
    segments.length === 3 &&
    segments[0] === "adventures" &&
    segments[2] === "history"
  ) {
    return { handler: "getHistory", params: { id: segments[1] } };
  }
  // POST /adventures/:id/message
  if (
    segments.length === 3 &&
    segments[0] === "adventures" &&
    segments[2] === "message"
  ) {
    return { handler: "postMessage", params: { id: segments[1] } };
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const match = matchPath(path);
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  switch (match.handler) {
    case "listAdventures":
      return NextResponse.json({ adventures: MOCK_ADVENTURES });

    case "getAdventure": {
      const adventure = MOCK_ADVENTURES.find((a) => a.id === match.params.id);
      if (!adventure) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({
        id: adventure.id,
        name: adventure.name,
        character: adventure.hasCharacter ? "# Thorin Ironforge\nDwarf Fighter" : null,
        world: adventure.hasWorld ? "# Lost Mines\nA classic adventure" : null,
        hasHistory: adventure.hasHistory,
      });
    }

    case "getHistory": {
      const adventure = MOCK_ADVENTURES.find((a) => a.id === match.params.id);
      if (!adventure) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({
        history: adventure.hasHistory ? MOCK_HISTORY : null,
        exists: adventure.hasHistory,
      });
    }

    default:
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const match = matchPath(path);
  if (!match || match.handler !== "postMessage") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  // Simulate SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const textChunks = [
        "The stone ",
        "lips part ",
        "with a grinding ",
        "sound that fills ",
        "the chamber. ",
        "A rush of cold air ",
        "escapes, carrying ",
        "the scent of deep ",
        "earth and something ",
        "older.",
      ];

      // Send text events
      for (const chunk of textChunks) {
        const event = `event: text\ndata: ${JSON.stringify({ text: chunk })}\n\n`;
        controller.enqueue(encoder.encode(event));
        await new Promise((r) => setTimeout(r, 100));
      }

      // Send a tool_use event
      const toolEvent = `event: tool_use\ndata: ${JSON.stringify({
        name: "dice-roller",
        result: "Rolled 1d20 + 4 (Perception) → 18. Success against DC 14.",
      })}\n\n`;
      controller.enqueue(encoder.encode(toolEvent));
      await new Promise((r) => setTimeout(r, 200));

      // More text after tool use
      const moreText = [
        "\n\nYou notice ",
        "a faint glow ",
        "emanating from ",
        "within the chest.",
      ];
      for (const chunk of moreText) {
        const event = `event: text\ndata: ${JSON.stringify({ text: chunk })}\n\n`;
        controller.enqueue(encoder.encode(event));
        await new Promise((r) => setTimeout(r, 100));
      }

      // Send done event
      const fullResponse =
        "The stone lips part with a grinding sound that fills the chamber. A rush of cold air escapes, carrying the scent of deep earth and something older.\n\nYou notice a faint glow emanating from within the chest.";
      const doneEvent = `event: done\ndata: ${JSON.stringify({ fullResponse })}\n\n`;
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
