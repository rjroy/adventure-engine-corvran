import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NarrativeEntry } from "../../src/components/NarrativeEntry";
import type { NarrativeEntry as NarrativeEntryType } from "../../src/types/protocol";

describe("NarrativeEntry", () => {
  describe("markdown rendering", () => {
    test("renders markdown tables as HTML tables", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: `| Stat | Value |
| --- | --- |
| Strength | 16 |
| Dexterity | 14 |`,
      };

      render(<NarrativeEntry entry={entry} />);

      const table = document.querySelector("table");
      expect(table).toBeInTheDocument();

      expect(screen.getByText("Stat")).toBeInTheDocument();
      expect(screen.getByText("Strength")).toBeInTheDocument();
      expect(screen.getByText("16")).toBeInTheDocument();
    });

    test("renders table headers with th elements", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: `| Name | HP |
| --- | --- |
| Goblin | 7 |`,
      };

      render(<NarrativeEntry entry={entry} />);

      const headers = document.querySelectorAll("th");
      expect(headers).toHaveLength(2);
      expect(headers[0]).toHaveTextContent("Name");
      expect(headers[1]).toHaveTextContent("HP");
    });

    test("renders table data with td elements", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: `| Item | Qty |
| --- | --- |
| Potion | 3 |
| Sword | 1 |`,
      };

      render(<NarrativeEntry entry={entry} />);

      const cells = document.querySelectorAll("td");
      expect(cells).toHaveLength(4);
      expect(cells[0]).toHaveTextContent("Potion");
      expect(cells[1]).toHaveTextContent("3");
    });

    test("renders mixed content with tables and text", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: `Your character sheet:

| Attribute | Score |
| --- | --- |
| STR | 18 |

You're ready for adventure!`,
      };

      render(<NarrativeEntry entry={entry} />);

      expect(screen.getByText(/Your character sheet/)).toBeInTheDocument();
      expect(document.querySelector("table")).toBeInTheDocument();
      expect(screen.getByText(/ready for adventure/)).toBeInTheDocument();
    });
  });

  describe("player input", () => {
    test("does not apply markdown to player input", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: "| this | is | not | a | table |",
      };

      render(<NarrativeEntry entry={entry} />);

      expect(document.querySelector("table")).not.toBeInTheDocument();
      expect(screen.getByText("| this | is | not | a | table |")).toBeInTheDocument();
    });
  });

  describe("streaming", () => {
    test("renders streaming content with markdown", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: "",
      };

      render(
        <NarrativeEntry
          entry={entry}
          isStreaming
          streamingText="**Bold** and *italic*"
        />
      );

      expect(document.querySelector("strong")).toBeInTheDocument();
      expect(document.querySelector("em")).toBeInTheDocument();
    });

    test("shows streaming cursor when streaming", () => {
      const entry: NarrativeEntryType = {
        id: "entry-1",
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: "",
      };

      render(<NarrativeEntry entry={entry} isStreaming streamingText="Loading..." />);

      expect(document.querySelector(".streaming-cursor")).toBeInTheDocument();
    });
  });
});
