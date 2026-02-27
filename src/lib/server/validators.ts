import { NextResponse } from "next/server";
import {
  ApiErrorResponse,
  CreateEventInput,
  EventStatus,
  EventType,
  LoginInput,
  RegisterInput,
  UpdateEventInput,
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

  return {
    title,
    description,
    type,
    date,
    time,
    status,
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

  console.error("Unhandled route error:", error);
  const body: ApiErrorResponse = { message: "Internal server error" };
  return NextResponse.json(body, { status: 500 });
}
