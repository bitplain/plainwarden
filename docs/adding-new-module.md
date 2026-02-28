# Adding a New Module

This guide explains how to add a new domain module to PlainWarden.

## Steps

### 1. Create Module Definition

Create a new directory `src/modules/<name>/` with an `index.ts`:

```typescript
import type { NetdenModule } from "@/modules/core/types";

export const myModule: NetdenModule = {
  id: "my-module",
  description: "Description of the module",
  routes: ["/my-module"],
  commands: ["/my-module"],
  toolsVersion: "1.0.0",
};
```

### 2. Register in Module Registry

Add the module to `src/modules/core/registry.ts`:

```typescript
import { myModule } from "@/modules/auth";
// ...
const modules: NetdenModule[] = [
  // existing modules...
  myModule,
];
```

### 3. Add Prisma Models (if needed)

Add your database models to `prisma/schema.prisma`:

```prisma
model MyEntity {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

Don't forget to add the reverse relation to the `User` model, then run:

```bash
npx prisma generate
```

### 4. Create Server-Side DB Service

Create `src/lib/server/<name>-db.ts` with CRUD functions:

```typescript
import prisma from "@/lib/server/prisma";

export async function listForUser(userId: string) {
  return prisma.myEntity.findMany({ where: { userId } });
}

export async function createForUser(userId: string, input: CreateInput) {
  return prisma.myEntity.create({ data: { userId, ...input } });
}

// ... update, delete
```

### 5. Create AI Tools

Create `src/tools/<name>.ts` with tool descriptors:

```typescript
import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import { listForUser, createForUser } from "@/lib/server/<name>-db";

export const myTools: AgentToolDescriptor[] = [
  {
    name: "my_module_list",
    module: "daily",  // or appropriate AgentModule
    mutating: false,
    description: "List items",
    parameters: {
      type: "object",
      properties: { /* ... */ },
    },
    execute: async (args, ctx) => {
      const items = await listForUser(ctx.userId);
      return { ok: true, data: items };
    },
  },
  // ... more tools
];
```

### 6. Register Tools

Add tools to `src/tools/index.ts`:

```typescript
import { myTools } from "@/tools/my-module";

const ALL_TOOLS: AgentToolDescriptor[] = [
  // existing tools...
  ...myTools,
];
```

### 7. Create API Route

Create `src/app/api/<name>/route.ts` following the existing pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { bootstrapAuth, getAuthenticatedUser } from "@/lib/server/auth";
import { HttpError, handleRouteError, readJsonBody } from "@/lib/server/validators";
import { getRateLimitResponse } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
  try {
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) throw new HttpError(401, "Unauthorized");
    // ... fetch and return data
  } catch (error) {
    return handleRouteError(error);
  }
}
```

### 8. Update Tests

- Update `tests/modules/registry.test.ts` to include new module
- Add tool contract tests in `tests/tools/<name>-tools.test.ts`
- Add unit tests for DB service logic

### 9. Update Documentation

- Update `docs/modular-architecture.md` with module description
- Update `docs/tool-contracts.md` with tool schemas

## Module Communication Rules

- **DO**: Import shared types from `@/modules/core/shared-types`
- **DO**: Use ItemLink tools for cross-module relationships
- **DON'T**: Import UI components or services from other modules
- **DON'T**: Access another module's DB tables directly
- **DON'T**: Add circular dependencies between modules

## Checklist

- [ ] Module definition in `src/modules/<name>/index.ts`
- [ ] Registered in `src/modules/core/registry.ts`
- [ ] Prisma schema updated (if DB needed)
- [ ] Server DB service in `src/lib/server/<name>-db.ts`
- [ ] AI tools in `src/tools/<name>.ts`
- [ ] Tools registered in `src/tools/index.ts`
- [ ] API route in `src/app/api/<name>/route.ts`
- [ ] Registry test updated
- [ ] Tool contract tests added
- [ ] Documentation updated
