import { NextResponse } from "next/server";
import {
  ApiErrorResponse,
  CreateEventInput,
  CreateNoteInput,
  EventRecurrence,
  RecurrenceFrequency,
  RecurrenceScope,
  EventStatus,
  EventType,
  LoginInput,
  RegisterInput,
  UpdateEventInput,
  UpdateNoteInput,
} from "@/lib/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM_REGEX = /^\d{2}:\d{2}$/;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

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

function readEventType(value: unknown): EventType {
  if (value === "event" || value === "task") {
    return value;
  }
  throw new HttpError(400, "type must be either 'event' or 'task'");
}

function readEventStatus(value: unknown): EventStatus {
  if (value === "pending" || value === "done") {
    return value;
  }
  throw new HttpError(400, "status must be either 'pending' or 'done'");
}

function readRecurrenceFrequency(value: unknown): RecurrenceFrequency {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }
  throw new HttpError(400, "recurrence.frequency must be one of 'daily', 'weekly', 'monthly'");
}

function readRecurrenceScope(value: unknown): RecurrenceScope {
  if (value === "this" || value === "all" || value === "this_and_following") {
    return value;
  }
  throw new HttpError(400, "recurrenceScope must be one of 'this', 'all', 'this_and_following'");
}

function readPositiveInteger(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {},
): number | undefined {
  const { min = 1, max = Number.MAX_SAFE_INTEGER, required = false } = options;
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpError(400, `${fieldName} is required`);
    }
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new HttpError(400, `${fieldName} must be an integer`);
  }
  if (value < min || value > max) {
    throw new HttpError(400, `${fieldName} must be between ${min} and ${max}`);
  }
  return value;
}

function readDate(value: unknown): string {
  const date = readString(value, "date");
  if (!ISO_DATE_REGEX.test(date)) {
    throw new HttpError(400, "date must use YYYY-MM-DD format");
  }
  return date;
}

function readTime(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "time must be a string in HH:MM format");
  }
  const normalized = value.trim();
  if (!HH_MM_REGEX.test(normalized)) {
    throw new HttpError(400, "time must use HH:MM format");
  }
  return normalized;
}

function readOptionalDate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (!ISO_DATE_REGEX.test(normalized)) {
    throw new HttpError(400, `${fieldName} must use YYYY-MM-DD format`);
  }
  return normalized;
}

function readRecurrence(value: unknown): EventRecurrence | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new HttpError(400, "recurrence must be an object");
  }

  const frequency = readRecurrenceFrequency(value.frequency);
  const interval = readPositiveInteger(value.interval, "recurrence.interval", {
    min: 1,
    max: 30,
  }) ?? 1;
  const count = readPositiveInteger(value.count, "recurrence.count", {
    min: 1,
    max: 400,
  });
  const until = readOptionalDate(value.until, "recurrence.until");

  if (!count && !until) {
    throw new HttpError(400, "recurrence must include either count or until");
  }

  return {
    frequency,
    interval,
    count,
    until,
  };
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function readJsonBody(
  request: Request,
  options: { maxSizeKB?: number } = {},
): Promise<unknown> {
  const maxSizeKB = options.maxSizeKB ?? 64;
  const maxSizeBytes = maxSizeKB * 1024;
  const contentLength = parseContentLength(request.headers.get("content-length"));

  if (contentLength !== null && contentLength > maxSizeBytes) {
    throw new HttpError(413, `Payload too large. Max size is ${maxSizeKB}KB`);
  }

  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }

  const sizeBytes = new TextEncoder().encode(rawBody).length;
  if (sizeBytes > maxSizeBytes) {
    throw new HttpError(413, `Payload too large. Max size is ${maxSizeKB}KB`);
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function validateLoginInput(body: unknown): LoginInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  const email = readString(body.email, "email", { maxLength: 255 }).toLowerCase();
  const password = readString(body.password, "password", { maxLength: 1024 });

  if (!EMAIL_REGEX.test(email)) {
    throw new HttpError(400, "email must be valid");
  }

  return { email, password };
}

export function validateRegisterInput(body: unknown): RegisterInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  const name = readString(body.name, "name", { maxLength: 100 });
  const email = readString(body.email, "email", { maxLength: 255 }).toLowerCase();
  const password = readString(body.password, "password", { maxLength: 1024 });

  if (!EMAIL_REGEX.test(email)) {
    throw new HttpError(400, "email must be valid");
  }

  if (password.length < 12) {
    throw new HttpError(400, "password must be at least 12 characters");
  }

  return { name, email, password };
}

export function validateCreateEventInput(body: unknown): CreateEventInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  const title = readString(body.title, "title", { maxLength: 100 });
  const description = readString(body.description, "description", { required: false, maxLength: 500 });
  const type = readEventType(body.type);
  const date = readDate(body.date);
  const time = readTime(body.time);
  const status = body.status === undefined ? "pending" : readEventStatus(body.status);
  const recurrence = readRecurrence(body.recurrence);

  if (recurrence?.until && recurrence.until < date) {
    throw new HttpError(400, "recurrence.until must be on or after date");
  }

  return {
    title,
    description,
    type,
    date,
    time,
    status,
    recurrence,
  };
}

export function validateUpdateEventInput(body: unknown): Omit<UpdateEventInput, "id"> {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  const payload: Omit<UpdateEventInput, "id"> = {};

  if (body.title !== undefined) {
    payload.title = readString(body.title, "title", { maxLength: 100 });
  }
  if (body.description !== undefined) {
    payload.description = readString(body.description, "description", {
      required: false,
      maxLength: 500,
    });
  }
  if (body.type !== undefined) {
    payload.type = readEventType(body.type);
  }
  if (body.date !== undefined) {
    payload.date = readDate(body.date);
  }
  if (body.time !== undefined) {
    payload.time = readTime(body.time);
  }
  if (body.status !== undefined) {
    payload.status = readEventStatus(body.status);
  }
  if (body.recurrence !== undefined) {
    payload.recurrence = readRecurrence(body.recurrence);
  }
  if (body.recurrenceScope !== undefined) {
    payload.recurrenceScope = readRecurrenceScope(body.recurrenceScope);
  }

  if (payload.recurrence && (!payload.recurrenceScope || payload.recurrenceScope === "this")) {
    throw new HttpError(
      400,
      "recurrence updates require recurrenceScope='all' or recurrenceScope='this_and_following'",
    );
  }

  if (payload.recurrence?.until && payload.date && payload.recurrence.until < payload.date) {
    throw new HttpError(400, "recurrence.until must be on or after date");
  }

  const hasMutableFields = Object.keys(payload).some((key) => key !== "recurrenceScope");
  if (!hasMutableFields) {
    throw new HttpError(400, "At least one field must be provided for update");
  }

  return payload;
}

export function validateCreateNoteInput(body: unknown): CreateNoteInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  const title = readString(body.title, "title", { maxLength: 200 });

  const body_ = body.body === undefined
    ? ""
    : readString(body.body, "body", { required: false, maxLength: 100000 });

  let parentId: string | undefined;
  if (body.parentId !== undefined && body.parentId !== null) {
    parentId = readString(body.parentId, "parentId");
  }

  let tags: string[] = [];
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      throw new HttpError(400, "tags must be an array");
    }
    tags = body.tags.map((t, i) => {
      if (typeof t !== "string") throw new HttpError(400, `tags[${i}] must be a string`);
      const trimmed = t.trim();
      if (!trimmed) throw new HttpError(400, `tags[${i}] must not be empty`);
      if (trimmed.length > 50) throw new HttpError(400, `tags[${i}] must be at most 50 characters`);
      return trimmed;
    });
    if (tags.length > 20) {
      throw new HttpError(400, "tags must contain at most 20 items");
    }
  }

  let eventLinks: string[] = [];
  if (body.eventLinks !== undefined) {
    if (!Array.isArray(body.eventLinks)) {
      throw new HttpError(400, "eventLinks must be an array");
    }
    eventLinks = body.eventLinks.map((e, i) => {
      if (typeof e !== "string") throw new HttpError(400, `eventLinks[${i}] must be a string`);
      return e.trim();
    });
  }

  return { title, body: body_, parentId, tags, eventLinks };
}

export function validateUpdateNoteInput(body: unknown): UpdateNoteInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Invalid payload");
  }

  const payload: UpdateNoteInput = {};

  if (body.title !== undefined) {
    payload.title = readString(body.title, "title", { maxLength: 200 });
  }
  if (body.body !== undefined) {
    payload.body = readString(body.body, "body", { required: false, maxLength: 100000 });
  }
  if ("parentId" in body) {
    if (body.parentId === null) {
      payload.parentId = null;
    } else if (body.parentId !== undefined) {
      payload.parentId = readString(body.parentId, "parentId");
    }
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      throw new HttpError(400, "tags must be an array");
    }
    payload.tags = body.tags.map((t, i) => {
      if (typeof t !== "string") throw new HttpError(400, `tags[${i}] must be a string`);
      const trimmed = t.trim();
      if (!trimmed) throw new HttpError(400, `tags[${i}] must not be empty`);
      if (trimmed.length > 50) throw new HttpError(400, `tags[${i}] must be at most 50 characters`);
      return trimmed;
    });
    if (payload.tags.length > 20) {
      throw new HttpError(400, "tags must contain at most 20 items");
    }
  }
  if (body.eventLinks !== undefined) {
    if (!Array.isArray(body.eventLinks)) {
      throw new HttpError(400, "eventLinks must be an array");
    }
    payload.eventLinks = body.eventLinks.map((e, i) => {
      if (typeof e !== "string") throw new HttpError(400, `eventLinks[${i}] must be a string`);
      return e.trim();
    });
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "At least one field must be provided for update");
  }

  return payload;
}

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    const body: ApiErrorResponse = { message: error.message };
    return NextResponse.json(body, { status: error.status });
  }

  if (error instanceof Error && error.name === "DbConflictError") {
    const body: ApiErrorResponse = { message: error.message };
    return NextResponse.json(body, { status: 409 });
  }

  if (error instanceof Error && error.name === "DbStateError") {
    const body: ApiErrorResponse = { message: error.message };
    return NextResponse.json(body, { status: 400 });
  }

  console.error("Unhandled route error:", error);
  const body: ApiErrorResponse = { message: "Internal server error" };
  return NextResponse.json(body, { status: 500 });
}
