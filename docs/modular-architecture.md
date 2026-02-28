# Modular Monolith Architecture

## Overview

PlainWarden is organized as a **modular monolith**: a single Next.js application with a shared PostgreSQL database, where each functional area is encapsulated in an independent module with clear boundaries.

```
src/
├── modules/           # Module definitions and registrations
│   ├── core/          # Shared types, plugin registry, session context
│   ├── calendar/      # Calendar events module
│   ├── kanban/        # Kanban boards (Tasks) module
│   ├── notes/         # Notes module
│   ├── journal/       # Journal / daily log module
│   ├── auth/          # Authentication module
│   ├── settings/      # User settings module
│   ├── setup/         # Setup wizard module
│   └── terminal/      # Terminal UI module
├── tools/             # AI tool descriptors (one file per domain)
│   ├── calendar.ts    # Calendar CRUD tools
│   ├── kanban.ts      # Kanban CRUD tools
│   ├── notes.ts       # Notes CRUD tools
│   ├── journal.ts     # Journal CRUD tools
│   ├── daily.ts       # Daily overview tool
│   ├── links.ts       # Cross-module ItemLink tools
│   └── index.ts       # Tool registry aggregator
├── agent/             # AI Core (AgentCore, intent, streaming, etc.)
├── components/        # React UI components
│   ├── AiChatWidget.tsx      # Floating AI chat
│   ├── AskAiButton.tsx       # Context "Ask AI" button
│   ├── ActionCard.tsx         # Action proposal cards
│   ├── AgentConsole.tsx       # Agent message display
│   ├── ConfirmAction.tsx      # Confirm/decline action
│   └── StreamingMessage.tsx   # Streaming text display
├── app/               # Next.js App Router pages and API routes
│   └── api/
│       ├── events/    # Calendar API
│       ├── kanban/    # Kanban API
│       ├── notes/     # Notes API
│       ├── journal/   # Journal API
│       ├── agent/     # AI Agent API
│       └── stream/    # SSE streaming endpoint
├── lib/               # Shared utilities, DB access, types
│   ├── server/        # Server-only modules (DB, auth, rate limiting)
│   └── types.ts       # Shared TypeScript types
└── hooks/             # React hooks (useAgent, useAgentMemory)
```

## 4 Domain Modules

### Calendar
- **Entities**: Events, EventSeries (recurrence)
- **DB**: `Event`, `EventSeries` tables in Prisma
- **Tools**: `calendar_list_events`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`
- **API**: `/api/events`

### Tasks (Kanban)
- **Entities**: KanbanBoard, KanbanColumn, KanbanCard, Checklists, Comments, Worklogs
- **DB**: `KanbanBoard`, `KanbanColumn`, `KanbanCard` and related tables
- **Tools**: `kanban_list_boards`, `kanban_list_cards`, `kanban_create_card`, `kanban_update_card`, `kanban_move_card`, `kanban_delete_card`
- **API**: `/api/kanban`

### Notes
- **Entities**: Note, NoteVersion, NoteLink, NoteEventLink
- **DB**: `Note`, `NoteVersion`, `NoteLink`, `NoteEventLink` tables
- **Tools**: `notes_search`, `notes_create`, `notes_update`, `notes_delete`
- **API**: `/api/notes`

### Journal
- **Entities**: JournalEntry (daily log entries with mood and tags)
- **DB**: `JournalEntry` table
- **Tools**: `journal_list`, `journal_get`, `journal_create`, `journal_update`, `journal_delete`
- **API**: `/api/journal`

## Cross-Module Data Model

### Item (conceptual)

All entities across modules can be represented as items with a common set of fields:

| Field     | Type   | Description                     |
|-----------|--------|---------------------------------|
| id        | string | UUID                            |
| type      | enum   | event, task, note, log          |
| title     | string | Display title                   |
| content   | string | Body/description (optional)     |
| status    | string | Status (optional)               |
| dateStart | string | Start date (optional)           |
| dateEnd   | string | End date (optional)             |
| createdAt | string | ISO timestamp                   |
| updatedAt | string | ISO timestamp                   |
| meta      | JSON   | Module-specific fields          |
| ownerId   | string | User ID                         |

### ItemLink

Cross-module relationships stored in the `ItemLink` table:

| Field        | Type   | Description                              |
|--------------|--------|------------------------------------------|
| id           | string | UUID                                     |
| fromItemId   | string | Source item ID                           |
| fromItemType | enum   | event, task, note, log                   |
| toItemId     | string | Target item ID                           |
| toItemType   | enum   | event, task, note, log                   |
| relationType | enum   | references, blocks, belongs_to, scheduled_for |
| createdAt    | string | ISO timestamp                            |

## AI Core

### Architecture

AI Core operates through:
1. **Plugin Registry** (`src/modules/core/plugin-registry.ts`) - modules register their tools
2. **Tool Execution** (`src/tools/index.ts`) - unified tool execution layer
3. **AgentCore** (`src/agent/AgentCore.ts`) - orchestrates LLM calls and tool execution
4. **Session Context** (`src/modules/core/session-context.ts`) - tracks session events
5. **Action Log** - records all tool calls and results

### Confirm-First Pattern

All mutating operations (create, update, delete) require explicit user confirmation:
1. AI proposes an action via `AgentActionProposal`
2. UI renders an ActionCard with Apply/Cancel buttons
3. Only after user clicks "Apply" is the tool executed
4. Results are logged in the action log

### OpenRouter Integration

- API key stored server-side only (env or encrypted in `UserLlmConfig`)
- Proxy through `/api/stream` endpoint
- Supports streaming SSE responses
- Tool-calling via OpenAI-compatible function calling format

## Module Communication Rules

1. **No direct imports** between module UI/services
2. **Shared types only** from `src/modules/core/shared-types.ts`
3. **Cross-module operations** via ItemLink tools or AI Core orchestration
4. **All DB access** through dedicated server-side service files (`*-db.ts`)
5. **AI Core** accesses modules only through registered tools, never directly
