import type { AgentToolDescriptor, ToolExecutionContext, ToolResult } from "@/agent/types";
import prisma from "@/lib/server/prisma";
import type { ItemLinkRelation, ItemType } from "@prisma/client";

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const VALID_ITEM_TYPES: ItemType[] = ["event", "task", "note", "log"];
const VALID_RELATIONS: ItemLinkRelation[] = ["references", "blocks", "belongs_to", "scheduled_for"];

function isValidItemType(value: string): value is ItemType {
  return VALID_ITEM_TYPES.includes(value as ItemType);
}

function isValidRelation(value: string): value is ItemLinkRelation {
  return VALID_RELATIONS.includes(value as ItemLinkRelation);
}

async function linkItems(
  args: Record<string, unknown>,
  _ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const fromItemId = toStringValue(args.fromItemId);
  const toItemId = toStringValue(args.toItemId);
  const fromItemType = toStringValue(args.fromItemType);
  const toItemType = toStringValue(args.toItemType);
  const relationType = toStringValue(args.relationType) ?? "references";

  if (!fromItemId || !toItemId || !fromItemType || !toItemType) {
    return { ok: false, error: "fromItemId, toItemId, fromItemType, toItemType are required" };
  }

  if (!isValidItemType(fromItemType)) {
    return { ok: false, error: `Invalid fromItemType: ${fromItemType}` };
  }
  if (!isValidItemType(toItemType)) {
    return { ok: false, error: `Invalid toItemType: ${toItemType}` };
  }
  if (!isValidRelation(relationType)) {
    return { ok: false, error: `Invalid relationType: ${relationType}` };
  }

  const link = await prisma.itemLink.upsert({
    where: {
      fromItemId_toItemId_relationType: {
        fromItemId,
        toItemId,
        relationType,
      },
    },
    update: {},
    create: {
      fromItemId,
      fromItemType,
      toItemId,
      toItemType,
      relationType,
    },
  });

  return {
    ok: true,
    data: {
      id: link.id,
      fromItemId: link.fromItemId,
      toItemId: link.toItemId,
      relationType: link.relationType,
    },
  };
}

async function unlinkItems(
  args: Record<string, unknown>,
  _ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const fromItemId = toStringValue(args.fromItemId);
  const toItemId = toStringValue(args.toItemId);
  const relationType = toStringValue(args.relationType) ?? "references";

  if (!fromItemId || !toItemId) {
    return { ok: false, error: "fromItemId and toItemId are required" };
  }

  if (!isValidRelation(relationType)) {
    return { ok: false, error: `Invalid relationType: ${relationType}` };
  }

  const existing = await prisma.itemLink.findUnique({
    where: {
      fromItemId_toItemId_relationType: {
        fromItemId,
        toItemId,
        relationType,
      },
    },
  });

  if (!existing) {
    return { ok: false, error: "link not found" };
  }

  await prisma.itemLink.delete({ where: { id: existing.id } });
  return { ok: true, data: { deleted: true } };
}

async function listLinks(
  args: Record<string, unknown>,
  _ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const itemId = toStringValue(args.itemId);
  if (!itemId) {
    return { ok: false, error: "itemId is required" };
  }

  const links = await prisma.itemLink.findMany({
    where: {
      OR: [{ fromItemId: itemId }, { toItemId: itemId }],
    },
    take: 100,
  });

  return {
    ok: true,
    data: links.map((link) => ({
      id: link.id,
      fromItemId: link.fromItemId,
      fromItemType: link.fromItemType,
      toItemId: link.toItemId,
      toItemType: link.toItemType,
      relationType: link.relationType,
      createdAt: link.createdAt.toISOString(),
    })),
  };
}

export const linkTools: AgentToolDescriptor[] = [
  {
    name: "items_link",
    module: "daily",
    mutating: true,
    description: "Create a link between two items (cross-module)",
    parameters: {
      type: "object",
      required: ["fromItemId", "fromItemType", "toItemId", "toItemType"],
      properties: {
        fromItemId: { type: "string" },
        fromItemType: { type: "string", enum: ["event", "task", "note", "log"] },
        toItemId: { type: "string" },
        toItemType: { type: "string", enum: ["event", "task", "note", "log"] },
        relationType: {
          type: "string",
          enum: ["references", "blocks", "belongs_to", "scheduled_for"],
          description: "Defaults to 'references'",
        },
      },
    },
    execute: linkItems,
  },
  {
    name: "items_unlink",
    module: "daily",
    mutating: true,
    description: "Remove a link between two items",
    parameters: {
      type: "object",
      required: ["fromItemId", "toItemId"],
      properties: {
        fromItemId: { type: "string" },
        toItemId: { type: "string" },
        relationType: {
          type: "string",
          enum: ["references", "blocks", "belongs_to", "scheduled_for"],
        },
      },
    },
    execute: unlinkItems,
  },
  {
    name: "items_list_links",
    module: "daily",
    mutating: false,
    description: "List all links for a given item",
    parameters: {
      type: "object",
      required: ["itemId"],
      properties: {
        itemId: { type: "string" },
      },
    },
    execute: listLinks,
  },
];
