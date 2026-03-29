<p align="center">
  <img src=".lore/art/logo.png" alt="Adventure Engine of Corvran" width="100" />
</p>

# Adventure Engine of Corvran

A space for collaborative storytelling. A human and an AI sit down together and make up a story, the way kids do.

> TTRPGs are shared narrative. At their core, it's kids playing make-believe but with rules. The AI is one of the kids who also happens to maintain the rules. The rules create stakes, not authority. The story belongs to everyone at the table.
>
> The ambition is not an AI that runs a simulation. It's an AI that plays with you.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (runtime and package manager)
- An Anthropic API key (`ANTHROPIC_API_KEY` environment variable)

### Install

```bash
git clone --recurse-submodules https://github.com/rjroy/adventure-engine-corvran.git
cd adventure-engine-corvran
bun install
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

### Development

```bash
bun run dev        # starts daemon + Next.js dev server
```

### Production

```bash
bun run build      # typecheck + build web
bun run start      # starts daemon + built web app
```

## Architecture

The application is a monorepo with three packages:

| Package | Path | Purpose |
|---------|------|---------|
| `@corvran/shared` | `packages/shared/` | Zod schemas and types for API contracts |
| `@corvran/backend` | `packages/backend/` | Hono daemon on Unix socket |
| `@corvran/web` | `packages/web/` | Next.js App Router client |

The backend is the application. The web client is just that, a client. All AI interaction uses the Claude Agent SDK. Game state lives in markdown files, readable by humans and AI alike.

### Plugins

RPG systems are content, not architecture. Each plugin teaches the AI how to run a game system through reference material and instructions, not application code.

| Plugin | Description |
|--------|-------------|
| `plugins/corvran` | The world of Corvran (setting) |
| `plugins/d20-system` | d20/5e system rules |
| `plugins/daggerheart-system` | Daggerheart system rules |

### Runtime Data

The daemon stores runtime data in `~/.corvran/` (override with `CORVRAN_HOME`). Adventures, socket files, and session state live here, not in the repo.

## Design Principles

0. **The Story is the Product** — everything serves the narrative
1. **Markdown is Memory** — all game state lives in markdown, readable by AI, developer, and player
2. **Teach, Don't Code** — RPG mechanics are documents the AI reads, not logic the system executes
3. **Player Agency is Sacred** — the AI never decides what the player does
4. **Progressive Simplification** — if the AI can do it with standard tools, remove the custom tool
5. **System-Agnostic Core** — the engine knows stories and participants, not d20s and spell slots

## Reference Material

This project includes third-party SRD (System Reference Document) content as git submodules for AI reference during gameplay:

| Submodule | Source | Content |
|-----------|--------|---------|
| `docs/research/daggerheart-srd` | [seansbox/daggerheart-srd](https://github.com/seansbox/daggerheart-srd) | Daggerheart SRD |
| `docs/research/dndsrd5.2_markdown` | [springbov/dndsrd5.2_markdown](https://github.com/springbov/dndsrd5.2_markdown) | D&D 5.2e SRD in Markdown |

These submodules contain reference material used by the AI during gameplay. They are not included in the application build.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Uses Daggerheart compatible rules
  <img src="docs/logo/darrington-press/compatible_with_DH_logos-10.png" alt="Compatible with Daggerheart" width="20" />
</p>
