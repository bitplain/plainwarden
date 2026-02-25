import { NextRequest } from "next/server";
import { AuthUser, PersistedUser, RegisterInput } from "@/lib/types";
import {
  DbConflictError,
  DbStateError,
  createUserRecord,
  findUserByEmail,
  findUserById,
  hasUsers,
  seedEventsForUser,
} from "@/lib/server/json-db";
import { getSessionFromRequest } from "@/lib/server/session";
import { isDatabaseConfigured } from "@/lib/server/setup";
import { HttpError } from "@/lib/server/validators";
import {
  hashPassword as hashPasswordInternal,
  verifyPassword as verifyPasswordInternal,
} from "@/lib/server/password";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return hashPasswordInternal(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verifyPasswordInternal(password, hash);
}

export function sanitizeUser(user: PersistedUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

let bootstrapPromise: Promise<void> | null = null;

async function ensureAuthBootstrap(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new HttpError(
      503,
      "База данных не настроена. Завершите /setup и добавьте переменные в Timeweb.",
    );
  }
  await hasUsers();
}

export async function bootstrapAuth(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = ensureAuthBootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}

export async function isSystemInitialized(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false;
  }
  return hasUsers();
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<PersistedUser | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function registerUser(
  input: RegisterInput,
  options: { mustBeFirst?: boolean } = {},
): Promise<PersistedUser> {
  const normalizedEmail = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await createUserRecord({
      email: normalizedEmail,
      name: input.name,
      passwordHash,
      mustBeFirst: options.mustBeFirst,
    });

    await seedEventsForUser(user.id);
    return user;
  } catch (error) {
    if (error instanceof DbStateError) {
      throw new HttpError(403, "Registration is closed");
    }
    if (error instanceof DbConflictError) {
      throw new HttpError(409, "User with this email already exists");
    }
    throw error;
  }
}

export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<PersistedUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return null;
  }

  return user;
}
