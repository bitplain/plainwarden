import {
  AddKanbanDependencyInput,
  CreateKanbanBoardInput,
  CreateKanbanCardInput,
  CreateKanbanChecklistInput,
  CreateKanbanChecklistItemInput,
  CreateKanbanCommentInput,
  CreateKanbanColumnInput,
  CreateKanbanWorklogInput,
  MoveKanbanCardInput,
  UpdateKanbanBoardInput,
  UpdateKanbanCardInput,
  UpdateKanbanChecklistInput,
  UpdateKanbanChecklistItemInput,
  UpdateKanbanColumnInput,
  UpdateKanbanCommentInput,
} from "@/lib/types";
import { HttpError } from "@/lib/server/validators";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: unknown,
  fieldName: string,
  options: { required?: boolean; maxLength?: number } = {},
): string {
  const { required = true, maxLength } = options;

  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) {
      return "";
    }
    throw new HttpError(400, `${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new HttpError(400, `${fieldName} must be less than ${maxLength} characters`);
  }

  return trimmed;
}

function readOptionalDate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new HttpError(400, `${fieldName} must be a string`);
  const trimmed = value.trim();
  if (!ISO_DATE_REGEX.test(trimmed)) {
    throw new HttpError(400, `${fieldName} must use YYYY-MM-DD format`);
  }
  return trimmed;
}

function readDatetime(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required`);
  }
  const trimmed = value.trim();
  if (!ISO_DATETIME_REGEX.test(trimmed)) {
    throw new HttpError(400, `${fieldName} must be an ISO 8601 datetime`);
  }
  return trimmed;
}

function readInteger(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {},
): number | undefined {
  const { min, max, required = false } = options;
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${fieldName} is required`);
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new HttpError(400, `${fieldName} must be an integer`);
  }
  if (min !== undefined && value < min) {
    throw new HttpError(400, `${fieldName} must be >= ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new HttpError(400, `${fieldName} must be <= ${max}`);
  }
  return value;
}

function readBoolean(value: unknown, fieldName: string, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") throw new HttpError(400, `${fieldName} must be a boolean`);
  return value;
}

function readStringArray(value: unknown, fieldName: string, maxItems = 100): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${fieldName} must be an array`);
  if (value.length > maxItems) throw new HttpError(400, `${fieldName} must have at most ${maxItems} items`);
  return value.map((item, i) => {
    if (typeof item !== "string") throw new HttpError(400, `${fieldName}[${i}] must be a string`);
    return item.trim();
  });
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export function validateCreateBoardInput(body: unknown): CreateKanbanBoardInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  return { title: readString(body.title, "title", { maxLength: 100 }) };
}

export function validateUpdateBoardInput(body: unknown): UpdateKanbanBoardInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const payload: UpdateKanbanBoardInput = {};
  if (body.title !== undefined) payload.title = readString(body.title, "title", { maxLength: 100 });
  if (Object.keys(payload).length === 0) throw new HttpError(400, "At least one field must be provided");
  return payload;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export function validateCreateColumnInput(body: unknown): CreateKanbanColumnInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const title = readString(body.title, "title", { maxLength: 100 });
  const position = readInteger(body.position, "position", { min: 0, required: true }) as number;
  const wipLimit = readInteger(body.wipLimit, "wipLimit", { min: 1, max: 999 });
  const isDone = readBoolean(body.isDone, "isDone", false);
  return { title, position, wipLimit, isDone };
}

export function validateUpdateColumnInput(body: unknown): UpdateKanbanColumnInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const payload: UpdateKanbanColumnInput = {};
  if (body.title !== undefined) payload.title = readString(body.title, "title", { maxLength: 100 });
  if (body.position !== undefined) payload.position = readInteger(body.position, "position", { min: 0 }) as number;
  if ("wipLimit" in body) {
    payload.wipLimit = body.wipLimit === null ? null : (readInteger(body.wipLimit, "wipLimit", { min: 1, max: 999 }) ?? null);
  }
  if (body.isDone !== undefined) payload.isDone = readBoolean(body.isDone, "isDone", false);
  if (Object.keys(payload).length === 0) throw new HttpError(400, "At least one field must be provided");
  return payload;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export function validateCreateCardInput(body: unknown): CreateKanbanCardInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const title = readString(body.title, "title", { maxLength: 255 });
  const description = readString(body.description, "description", { required: false, maxLength: 10000 });
  const position = readInteger(body.position, "position", { min: 0, required: true }) as number;
  const dueDate = readOptionalDate(body.dueDate, "dueDate");
  const eventLinks = readStringArray(body.eventLinks, "eventLinks");
  return { title, description, position, dueDate, eventLinks };
}

export function validateUpdateCardInput(body: unknown): UpdateKanbanCardInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const payload: UpdateKanbanCardInput = {};
  if (body.title !== undefined) payload.title = readString(body.title, "title", { maxLength: 255 });
  if (body.description !== undefined) payload.description = readString(body.description, "description", { required: false, maxLength: 10000 });
  if ("dueDate" in body) {
    payload.dueDate = body.dueDate === null ? null : readOptionalDate(body.dueDate, "dueDate");
  }
  if (body.eventLinks !== undefined) payload.eventLinks = readStringArray(body.eventLinks, "eventLinks");
  if (Object.keys(payload).length === 0) throw new HttpError(400, "At least one field must be provided");
  return payload;
}

export function validateMoveCardInput(body: unknown): MoveKanbanCardInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const columnId = readString(body.columnId, "columnId");
  const position = readInteger(body.position, "position", { min: 0, required: true }) as number;
  return { columnId, position };
}

// ─── Checklists ───────────────────────────────────────────────────────────────

export function validateCreateChecklistInput(body: unknown): CreateKanbanChecklistInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  return { title: readString(body.title, "title", { maxLength: 200 }) };
}

export function validateUpdateChecklistInput(body: unknown): UpdateKanbanChecklistInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const payload: UpdateKanbanChecklistInput = {};
  if (body.title !== undefined) payload.title = readString(body.title, "title", { maxLength: 200 });
  if (Object.keys(payload).length === 0) throw new HttpError(400, "At least one field must be provided");
  return payload;
}

export function validateCreateChecklistItemInput(body: unknown): CreateKanbanChecklistItemInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const text = readString(body.text, "text", { maxLength: 500 });
  const position = readInteger(body.position, "position", { min: 0, required: true }) as number;
  return { text, position };
}

export function validateUpdateChecklistItemInput(body: unknown): UpdateKanbanChecklistItemInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const payload: UpdateKanbanChecklistItemInput = {};
  if (body.text !== undefined) payload.text = readString(body.text, "text", { maxLength: 500 });
  if (body.completed !== undefined) payload.completed = readBoolean(body.completed, "completed", false);
  if (body.position !== undefined) payload.position = readInteger(body.position, "position", { min: 0 }) as number;
  if (Object.keys(payload).length === 0) throw new HttpError(400, "At least one field must be provided");
  return payload;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export function validateCreateCommentInput(body: unknown): CreateKanbanCommentInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  return { body: readString(body.body, "body", { maxLength: 10000 }) };
}

export function validateUpdateCommentInput(body: unknown): UpdateKanbanCommentInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  return { body: readString(body.body, "body", { maxLength: 10000 }) };
}

// ─── Worklog ──────────────────────────────────────────────────────────────────

export function validateCreateWorklogInput(body: unknown): CreateKanbanWorklogInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  const startedAt = readDatetime(body.startedAt, "startedAt");
  const endedAt = readDatetime(body.endedAt, "endedAt");

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new HttpError(400, "startedAt and endedAt must be valid dates");
  }
  if (end < start) {
    throw new HttpError(400, "endedAt must be on or after startedAt");
  }

  const note = readString(body.note, "note", { required: false, maxLength: 500 });
  return { startedAt, endedAt, note };
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

export function validateAddDependencyInput(body: unknown): AddKanbanDependencyInput {
  if (!isRecord(body)) throw new HttpError(400, "Invalid payload");
  return { dependsOnId: readString(body.dependsOnId, "dependsOnId") };
}
