# Changelog

All notable changes to the Adventure Engine of Corvran.

## [Unreleased]

## [2.1.0] - 2026-04-16

### Added

- **View Files** (#259, #260): File tree browser and content viewer in the adventure play interface. Players can navigate the adventure's file structure and read files directly from the chat UI.
- **Conversation compaction** (#258): When message count crosses a configurable threshold, older messages are automatically summarized to keep context windows manageable. The GM can also trigger compaction manually via an MCP tool. Active sessions receive SSE notifications so the UI can refresh history.
- **Apocrypha RPG system plugin** (#258): New keyword-driven RPG system designed for LLM game mastering. Uses 2d12 resolution with keyword-based character abilities instead of numeric stats. Includes rules, player management, combat, and adversary skill packages.
- **RPG system plugin spec** (#258): Generalized specification for how any RPG system integrates as a plugin.

### Changed

- Agent SDK updated to `^0.2.112`; removed unused `@anthropic-ai/sdk` dev dependency (#260)
- Next.js updated to `^16.2.4` (#260)

### Fixed

- Replicate returning WebP images broke hue extraction; backend now handles WebP-disguised-as-PNG correctly (#257)
- Mood system pipeline failures and inconsistent GM file use (#256)

---

## [2.0.1] - 2026-03-31

### Added

- **Dynamic Mood System** (#255): The GM can shift the visual mood of an adventure session at runtime. The system generates a color palette from a reference image (via Replicate), extracts dominant hues, and applies them as CSS variables across the UI. Mood changes propagate to all connected clients via SSE.
- CI pipeline (GitHub Actions) (#255)

### Fixed

- iOS Safari keyboard zoom and layout resize regressions (#253)

---

## [2.0.0] - 2026-03-29

Complete greenfield reboot. The previous implementation proved the core beliefs work. v2.0.0 rebuilds with those beliefs as the foundation rather than something discovered along the way: markdown as memory, teach-don't-code for RPG systems, system-agnostic core, and player agency as a hard boundary.

### Added

- **Adventure creation flow** (#254): Full end-to-end flow for creating and launching adventures from the web UI. Includes backend routes, plugin/system selection, and shared Zod schemas for the creation payload.
- **Engine dice tool** (#252): MCP tool that the GM can invoke to resolve dice rolls, integrated into the adventure session runner.
- **Adventure system integration** (#252): Plugin registry loads and mounts RPG system plugins at session start. Prompt service composes the system bootstrap prompt alongside the GM prompt.
- **iOS mobile UX** (#252, #253): Viewport and layout fixes for iPhone Safari, including keyboard resize handling and scroll behavior.

[Unreleased]: https://github.com/rjroy/corvran/compare/v2.0.0...HEAD
[2.1.0]: https://github.com/rjroy/corvran/compare/v2.0.0...ba4aece
[2.0.1]: https://github.com/rjroy/corvran/compare/v2.0.0...6913357
[2.0.0]: https://github.com/rjroy/corvran/releases/tag/v2.0.0
