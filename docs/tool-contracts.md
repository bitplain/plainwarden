# Tool Contracts (JSON Schema)

Each module exposes a set of tools that AI Core can invoke. Tools follow the OpenAI function-calling format.

---

## Calendar Module

### `calendar_list_events`
- **Module**: calendar
- **Mutating**: false
- **Description**: List events/tasks from calendar with optional date and status filters
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "q": { "type": "string" },
    "type": { "type": "string", "enum": ["event", "task"] },
    "status": { "type": "string", "enum": ["pending", "done"] },
    "dateFrom": { "type": "string" },
    "dateTo": { "type": "string" },
    "limit": { "type": "number" }
  }
}
```

### `calendar_create_event`
- **Module**: calendar
- **Mutating**: true
- **Description**: Create event/task in calendar
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["title", "date"],
  "properties": {
    "title": { "type": "string" },
    "description": { "type": "string" },
    "date": { "type": "string", "description": "YYYY-MM-DD or relative keyword" },
    "time": { "type": "string" },
    "type": { "type": "string", "enum": ["event", "task"] },
    "status": { "type": "string", "enum": ["pending", "done"] }
  }
}
```

### `calendar_update_event`
- **Module**: calendar
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["eventId"],
  "properties": {
    "eventId": { "type": "string" },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "date": { "type": "string" },
    "time": { "type": "string" },
    "status": { "type": "string", "enum": ["pending", "done"] },
    "type": { "type": "string", "enum": ["event", "task"] },
    "scope": { "type": "string", "enum": ["this", "all", "this_and_following"] },
    "revision": { "type": "number" }
  }
}
```

### `calendar_delete_event`
- **Module**: calendar
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["eventId"],
  "properties": {
    "eventId": { "type": "string" },
    "scope": { "type": "string", "enum": ["this", "all", "this_and_following"] }
  }
}
```

---

## Kanban (Tasks) Module

### `kanban_list_boards`
- **Mutating**: false
- **Input Schema**: `{ "type": "object", "properties": {} }`

### `kanban_list_cards`
- **Mutating**: false
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "boardId": { "type": "string" }
  }
}
```

### `kanban_create_card`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["columnId", "title"],
  "properties": {
    "columnId": { "type": "string" },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "position": { "type": "number" },
    "dueDate": { "type": "string" },
    "eventLinks": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `kanban_update_card`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["cardId"],
  "properties": {
    "cardId": { "type": "string" },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "dueDate": { "type": ["string", "null"] },
    "eventLinks": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `kanban_move_card`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["cardId", "columnId"],
  "properties": {
    "cardId": { "type": "string" },
    "columnId": { "type": "string" },
    "position": { "type": "number" }
  }
}
```

### `kanban_delete_card`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["cardId"],
  "properties": {
    "cardId": { "type": "string" }
  }
}
```

---

## Notes Module

### `notes_search`
- **Mutating**: false
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "q": { "type": "string" },
    "tag": { "type": "string" },
    "parentId": { "type": "string" }
  }
}
```

### `notes_create`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["title"],
  "properties": {
    "title": { "type": "string" },
    "body": { "type": "string" },
    "parentId": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "eventLinks": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `notes_update`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["noteId"],
  "properties": {
    "noteId": { "type": "string" },
    "title": { "type": "string" },
    "body": { "type": "string" },
    "parentId": { "type": ["string", "null"] },
    "tags": { "type": "array", "items": { "type": "string" } },
    "eventLinks": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `notes_delete`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["noteId"],
  "properties": {
    "noteId": { "type": "string" }
  }
}
```

---

## Journal Module

### `journal_list`
- **Mutating**: false
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "Exact date YYYY-MM-DD" },
    "dateFrom": { "type": "string" },
    "dateTo": { "type": "string" },
    "q": { "type": "string" },
    "tag": { "type": "string" }
  }
}
```

### `journal_get`
- **Mutating**: false
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["entryId"],
  "properties": {
    "entryId": { "type": "string" }
  }
}
```

### `journal_create`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["title", "date"],
  "properties": {
    "title": { "type": "string" },
    "body": { "type": "string" },
    "date": { "type": "string", "description": "Date YYYY-MM-DD" },
    "mood": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `journal_update`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["entryId"],
  "properties": {
    "entryId": { "type": "string" },
    "title": { "type": "string" },
    "body": { "type": "string" },
    "date": { "type": "string" },
    "mood": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `journal_delete`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["entryId"],
  "properties": {
    "entryId": { "type": "string" }
  }
}
```

---

## Cross-Module Link Tools

### `items_link`
- **Mutating**: true
- **Description**: Create a link between two items (cross-module)
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["fromItemId", "fromItemType", "toItemId", "toItemType"],
  "properties": {
    "fromItemId": { "type": "string" },
    "fromItemType": { "type": "string", "enum": ["event", "task", "note", "log"] },
    "toItemId": { "type": "string" },
    "toItemType": { "type": "string", "enum": ["event", "task", "note", "log"] },
    "relationType": { "type": "string", "enum": ["references", "blocks", "belongs_to", "scheduled_for"] }
  }
}
```

### `items_unlink`
- **Mutating**: true
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["fromItemId", "toItemId"],
  "properties": {
    "fromItemId": { "type": "string" },
    "toItemId": { "type": "string" },
    "relationType": { "type": "string", "enum": ["references", "blocks", "belongs_to", "scheduled_for"] }
  }
}
```

### `items_list_links`
- **Mutating**: false
- **Input Schema**:
```json
{
  "type": "object",
  "required": ["itemId"],
  "properties": {
    "itemId": { "type": "string" }
  }
}
```

---

## Daily Overview Tool

### `daily_overview`
- **Mutating**: false
- **Description**: Get daily planner overview for tasks and deadlines
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "startDate": { "type": "string" },
    "days": { "type": "number" }
  }
}
```

---

## Output Format

All tools return:
```typescript
interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}
```
