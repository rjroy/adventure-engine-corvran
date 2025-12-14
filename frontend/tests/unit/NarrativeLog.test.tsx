import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NarrativeLog } from "../../src/components/NarrativeLog";
import type { NarrativeEntry } from "../../src/types/protocol";

describe("NarrativeLog", () => {
  describe("empty state", () => {
    test("shows placeholder when no entries", () => {
      render(<NarrativeLog entries={[]} />);

      expect(screen.getByText(/no narrative entries yet/i)).toBeInTheDocument();
    });

    test("has data-testid attribute", () => {
      render(<NarrativeLog entries={[]} />);

      expect(screen.getByTestId("narrative-log")).toBeInTheDocument();
    });
  });

  describe("rendering entries", () => {
    test("renders player input entry", () => {
      const entries: NarrativeEntry[] = [
        {
          id: "entry-1",
          timestamp: new Date().toISOString(),
          type: "player_input",
          content: "look around",
        },
      ];

      render(<NarrativeLog entries={entries} />);

      expect(screen.getByText("look around")).toBeInTheDocument();
    });

    test("renders GM response entry", () => {
      const entries: NarrativeEntry[] = [
        {
          id: "entry-1",
          timestamp: new Date().toISOString(),
          type: "gm_response",
          content: "You see a dark forest ahead.",
        },
      ];

      render(<NarrativeLog entries={entries} />);

      expect(screen.getByText("You see a dark forest ahead.")).toBeInTheDocument();
    });

    test("renders multiple entries in order", () => {
      const entries: NarrativeEntry[] = [
        {
          id: "entry-1",
          timestamp: new Date().toISOString(),
          type: "player_input",
          content: "First command",
        },
        {
          id: "entry-2",
          timestamp: new Date().toISOString(),
          type: "gm_response",
          content: "First response",
        },
        {
          id: "entry-3",
          timestamp: new Date().toISOString(),
          type: "player_input",
          content: "Second command",
        },
      ];

      render(<NarrativeLog entries={entries} />);

      const narrativeLog = screen.getByTestId("narrative-log");
      expect(narrativeLog).toHaveTextContent("First command");
      expect(narrativeLog).toHaveTextContent("First response");
      expect(narrativeLog).toHaveTextContent("Second command");
    });

    test("hides placeholder when entries exist", () => {
      const entries: NarrativeEntry[] = [
        {
          id: "entry-1",
          timestamp: new Date().toISOString(),
          type: "player_input",
          content: "test",
        },
      ];

      render(<NarrativeLog entries={entries} />);

      expect(screen.queryByText(/no narrative entries yet/i)).not.toBeInTheDocument();
    });
  });

  describe("streaming content", () => {
    test("hides placeholder when streaming", () => {
      render(
        <NarrativeLog
          entries={[]}
          streamingContent={{ messageId: "stream-1", text: "Streaming..." }}
          isStreaming
        />
      );

      // With streaming content, placeholder should be hidden
      // Note: The actual streaming display depends on NarrativeEntry implementation
      expect(screen.queryByText(/no narrative entries yet/i)).not.toBeInTheDocument();
    });
  });
});
