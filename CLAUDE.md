# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** — an AI-powered React component generator with live preview. Users describe React components in natural language; Claude AI generates them using a virtual (in-memory) file system with real-time preview.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run db:reset     # Reset SQLite database
```

Run a single test file:
```bash
npx vitest run src/components/chat/__tests__/MessageList.test.tsx
```

## Architecture

### Request Flow

1. User types in chat → `ChatInterface.tsx`
2. Message sent to `POST /api/chat` (`src/app/api/chat/route.ts`)
3. Route calls Claude (or mock) via Vercel AI SDK, with two tools: `str_replace_editor` and `file_manager`
4. AI tool calls modify the in-memory `VirtualFileSystem`
5. File changes stream back to the frontend via `FileSystemContext`
6. `PreviewFrame` renders the component live using Babel standalone for JSX transformation
7. If authenticated, project state (messages + file data as JSON strings) persists to SQLite

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/file-system.ts` | In-memory tree-based VFS — core data structure |
| `src/lib/provider.ts` | Selects real Claude (if `ANTHROPIC_API_KEY` set) or mock model |
| `src/lib/contexts/` | `ChatContext` and `FileSystemContext` — main client state |
| `src/lib/tools/` | `str_replace_editor` and `file_manager` — tools available to Claude during generation |
| `src/lib/prompts/generation.tsx` | System prompt sent to Claude; defines conventions for generated components |
| `src/lib/auth.ts` | JWT auth via httpOnly cookies, 7-day expiry |
| `src/lib/transform/jsx-transformer.ts` | Babel standalone transpilation for live preview |
| `src/actions/` | Next.js Server Actions for project CRUD |
| `prisma/schema.prisma` | Two models: `User` and `Project` (messages/files stored as stringified JSON) |

### AI Provider Behavior

- `ANTHROPIC_API_KEY` present → Claude Haiku 4.5, up to 40 steps, 10k tokens
- No key → `MockLanguageModel` with canned components, max 4 steps (demo mode)

### Generated Component Conventions (from system prompt)

- Root entry point must be `/App.jsx`
- Use `@/` import alias for non-library files (maps to `src/`)
- Components use Tailwind CSS v4 for styling
- All file operations go through the VFS — nothing writes to disk

### Database

SQLite at `prisma/dev.db`. `Project.messages` and `Project.data` are JSON strings. `userId` is nullable (anonymous projects supported).

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

### Path Alias

`@/*` → `./src/*` (configured in `tsconfig.json` and `vitest.config.mts`)

## Coding Guidelines

- Use comments sparingly in code. When commenting, provide enough detail to explain the intent, logic, or known bugs — not just what the code does, but why.
