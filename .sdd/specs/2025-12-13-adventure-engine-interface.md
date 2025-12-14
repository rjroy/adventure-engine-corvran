---
version: 1.0.0
status: Approved
created: 2025-12-13
last_updated: 2025-12-13
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Adventure Engine Interface Specification

## Executive Summary

This specification defines the interface architecture for the Adventure Engine of Corvran, an AI-powered tabletop RPG game master system. The MVP focuses on establishing the communication protocol between a web-based frontend and a backend server that uses the Claude Agent SDK to power the game master.

The system enables players to engage in text-based interactive adventures through a web browser. Player inputs flow to the server via WebSocket, the server invokes Claude through the Agent SDK for narrative responses and game logic, and results stream back to the player in real-time.

This specification covers the MVP scope: single-player text adventures with the architectural foundation for future expansion to full RPG mechanics and multiplayer support.

## User Story

As a player, I want to engage in an interactive text adventure through my web browser, where an AI game master responds to my actions, maintains narrative continuity, and creates an immersive storytelling experience.

## Stakeholders

- **Primary**: Players seeking AI-powered interactive fiction and tabletop-style adventures
- **Secondary**: Adventure authors creating world content and campaign materials
- **Tertiary**: Future contributors, Claude Code plugin ecosystem maintainers

## Success Criteria

1. Player can start a new adventure and receive narrative responses within 5 seconds of submitting input
2. Conversation history persists across browser sessions for the same adventure
3. Game master maintains narrative consistency throughout a session (no contradictions or forgotten context)
4. System gracefully handles Claude API errors with user-friendly messaging
5. WebSocket connection recovers automatically from temporary disconnections

## Functional Requirements

### Core Infrastructure

- **REQ-F-1**: System shall consist of three components: web-based frontend, application server, and Claude Agent SDK integration
- **REQ-F-2**: Frontend and backend shall communicate via WebSocket for real-time bidirectional messaging
- **REQ-F-3**: System shall support REST endpoints for non-streaming operations (adventure management, state queries)
- **REQ-F-4**: Each adventure shall have a unique identifier used to isolate state and conversation history

### Claude Agent SDK Integration

- **REQ-F-5**: Backend shall use Claude Agent SDK (not raw Anthropic API) to invoke Claude as the game master
- **REQ-F-6**: System shall stream Claude's responses token-by-token to the frontend as they are generated
- **REQ-F-7**: System shall maintain conversation history within the Agent SDK session for context continuity
- **REQ-F-8**: System shall provide Claude with adventure context (world state, current scene, player history) via system prompts or tool context
- **REQ-F-9**: System architecture shall support Claude tools; MVP requires no specific game mechanic tools (placeholder for future RPG mechanics)
- **REQ-F-10**: Claude shall have access to read/write adventure state files for persistence

### Web Application - Frontend

- **REQ-F-11**: Frontend shall display a scrollable narrative log showing player inputs and GM responses
- **REQ-F-12**: Frontend shall provide a text input field for player commands/actions
- **REQ-F-13**: Frontend shall display streaming GM responses as they arrive (typewriter effect)
- **REQ-F-14**: Frontend shall indicate connection status (connected, disconnected, reconnecting)
- **REQ-F-15**: Frontend shall persist adventure ID in browser storage for session continuity
- **REQ-F-16**: Frontend shall provide UI to start a new adventure or resume an existing one

### Web Application - Backend

- **REQ-F-17**: Backend shall manage WebSocket connections with heartbeat/ping-pong for connection health
- **REQ-F-18**: Backend shall queue player inputs during Claude processing to prevent race conditions
- **REQ-F-19**: Backend shall persist adventure state to the filesystem in project directory
- **REQ-F-20**: Backend shall load adventure state on connection resume

### Adventure State Management

- **REQ-F-21**: Adventure state shall include: narrative history, current scene, world state snapshot, player character data
- **REQ-F-22**: State shall be saved after each GM response completes
- **REQ-F-23**: State files shall be human-readable (JSON or YAML) for debugging and manual editing
- **REQ-F-24**: System shall support multiple adventures per project directory (each with unique ID)

### Error Handling

- **REQ-F-25**: If Claude Agent SDK returns an error, system shall display user-friendly message and allow retry
- **REQ-F-26**: If WebSocket disconnects, frontend shall attempt reconnection with exponential backoff
- **REQ-F-27**: If state file is corrupted, system shall offer to start fresh or load backup
- **REQ-F-28**: System shall log errors to server logs with sufficient detail for debugging

## Non-Functional Requirements

- **REQ-NF-1** (Performance): GM response shall begin streaming within 3 seconds of player input submission
- **REQ-NF-2** (Reliability): WebSocket reconnection shall succeed within 30 seconds for transient network issues
- **REQ-NF-3** (Usability): UI shall be usable on desktop browsers (Chrome, Firefox, Safari); mobile is out of scope for MVP
- **REQ-NF-4** (Maintainability): Frontend and backend shall be in separate directories with clear API contracts
- **REQ-NF-5** (Security): WebSocket connections shall be authenticated via session token to prevent unauthorized access

## Explicit Constraints (DO NOT)

- Do NOT use the raw Anthropic API - use Claude Agent SDK exclusively
- Do NOT implement multiplayer in MVP - architecture should accommodate it but not implement it
- Do NOT implement RPG mechanics (dice, stats, combat) in MVP - text adventure only
- Do NOT require external databases - use filesystem for all persistence
- Do NOT optimize for mobile browsers in MVP
- Do NOT implement user authentication/accounts - single-user local operation

## Technical Context

- **Existing Stack**: Claude Code plugin architecture (adventure-engine-corvran plugin)
- **Technology Choices** (project decisions, not requirements):
  - Frontend: React + Vite + TypeScript
  - Backend: Bun runtime + Hono framework
  - AI Integration: Claude Agent SDK
- **Integration Points**:
  - Claude Agent SDK for AI game master capabilities
  - Existing `enter-world` skill for launching the application
  - Project directory structure for adventure state storage
- **Patterns to Respect**:
  - Follow wyrd-gateway plugin conventions
  - Use TypeScript throughout (frontend and backend)
  - Use Bun as runtime (not Node.js)

## Acceptance Tests

1. **New Adventure Start**: Player opens web UI, clicks "New Adventure", receives initial narrative scene from GM within 5 seconds

2. **Player Input Response**: Player types "look around", submits, sees streaming GM response describing the environment

3. **Session Persistence**: Player closes browser, reopens, selects "Resume Adventure", conversation history is intact and GM remembers context

4. **Streaming Display**: GM response of 500+ words displays progressively (typewriter style), not all at once

5. **Connection Recovery**: WebSocket is forcibly closed (network blip), frontend shows "Reconnecting...", connection restores within 10 seconds, player can continue

6. **Error Display**: Claude API returns rate limit error, player sees "The game master needs a moment. Please try again." (not raw error)

7. **State File Integrity**: After 10 exchanges, adventure state file in project directory contains complete history and is valid JSON/YAML

8. **Multiple Adventures**: Player creates Adventure A, then Adventure B, can switch between them without data crossover

## Open Questions

- [x] Should the `enter-world` skill launch the server and open a browser, or just the server?
  - **Resolved**: Launch server AND open browser automatically
- [x] What default world/scenario should new adventures start with?
  - **Resolved**: Open-ended prompt inviting player imagination: "The adventure is just beginning. Describe what you see, and the world will expand before you." (GM embellishes appropriately)
- [x] Should adventure state include undo/rollback capability?
  - **Resolved**: No mechanical undo. GM handles in-narrative corrections ("I didn't mean to say it like that") through roleplay, not state manipulation

## Out of Scope

- RPG mechanics (character sheets, dice rolling, combat systems) - future enhancement
- Multiplayer/party play - future enhancement
- Mobile-optimized UI - future enhancement
- User accounts and authentication - local single-user operation only
- Voice input/output - text only
- Map visualization - text descriptions only
- Integration with virtual tabletop tools (Roll20, Foundry) - standalone system

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
