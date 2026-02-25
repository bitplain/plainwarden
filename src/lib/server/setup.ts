import crypto from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Client, escapeIdentifier } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mockEvents } from "@/lib/mock-data";
import {
  SetupPgAdminInput,
  SetupRecoverInput,
  SetupRunInput,
  SetupSiteAdminInput,
  SetupSummary,
  SslMode,
} from "@/lib/types";
import { HttpError } from "@/lib/server/validators";
import { hashPassword } from "@/lib/server/password";

const execFileAsync = promisify(execFile);
const IDENTIFIER_REGEX = /^[A-Za-z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function assertRecord(value: unknown, message = "Invalid payload"): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new HttpError(400, message);
  }
}

function readRequiredString(value: unknown, fieldName: string, maxLength = 255): string {
  const cleaned = normalize(value);
  if (!cleaned) {
    throw new HttpError(400, `${fieldName} is required`);
  }
  if (cleaned.length > maxLength) {
    throw new HttpError(400, `${fieldName} is too long`);
  }
  return cleaned;
}

function readOptionalString(value: unknown, fieldName: string, maxLength = 255): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const cleaned = normalize(value);
  if (!cleaned) {
    return undefined;
  }
  if (cleaned.length > maxLength) {
    throw new HttpError(400, `${fieldName} is too long`);
  }
  return cleaned;
}

function readPort(value: unknown): number {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 65535) {
    throw new HttpError(400, "pgAdmin.port must be a valid TCP port");
  }
  return normalized;
}

function readSslMode(value: unknown): SslMode {
  if (value === "disable" || value === "require") {
    return value;
  }
  throw new HttpError(400, "pgAdmin.sslMode must be 'disable' or 'require'");
}

function readIdentifier(value: unknown, fieldName: string): string {
  const cleaned = readRequiredString(value, fieldName, 63);
  if (!IDENTIFIER_REGEX.test(cleaned)) {
    throw new HttpError(
      400,
      `${fieldName} may contain only latin letters, numbers, and underscore`,
    );
  }
  return cleaned;
}

function readEmail(value: unknown, fieldName: string): string {
  const cleaned = readRequiredString(value, fieldName, 255).toLowerCase();
  if (!EMAIL_REGEX.test(cleaned)) {
    throw new HttpError(400, `${fieldName} must be a valid email`);
  }
  return cleaned;
}

function readPgAdmin(value: unknown): SetupPgAdminInput {
  assertRecord(value, "pgAdmin must be an object");

  return {
    host: readRequiredString(value.host, "pgAdmin.host", 255),
    port: readPort(value.port),
    user: readRequiredString(value.user, "pgAdmin.user", 255),
    password: readRequiredString(value.password, "pgAdmin.password", 512),
    sslMode: readSslMode(value.sslMode),
  };
}

export function validateSetupRunInput(payload: unknown): SetupRunInput {
  assertRecord(payload);
  assertRecord(payload.provision, "provision must be an object");
  assertRecord(payload.siteAdmin, "siteAdmin must be an object");

  const appPassword = readOptionalString(payload.provision.appPassword, "provision.appPassword", 128);
  if (appPassword && appPassword.length < 8) {
    throw new HttpError(400, "provision.appPassword must be at least 8 characters");
  }

  const siteAdmin: SetupSiteAdminInput = {
    name: readRequiredString(payload.siteAdmin.name, "siteAdmin.name", 100),
    email: readEmail(payload.siteAdmin.email, "siteAdmin.email"),
    password: readRequiredString(payload.siteAdmin.password, "siteAdmin.password", 256),
  };

  if (siteAdmin.password.length < 8) {
    throw new HttpError(400, "siteAdmin.password must be at least 8 characters");
  }

  return {
    pgAdmin: readPgAdmin(payload.pgAdmin),
    provision: {
      dbName: readIdentifier(payload.provision.dbName, "provision.dbName"),
      appRole: readIdentifier(payload.provision.appRole, "provision.appRole"),
      appPassword,
    },
    siteAdmin,
  };
}

export function validateSetupRecoverInput(payload: unknown): SetupRecoverInput {
  assertRecord(payload);
  assertRecord(payload.provision, "provision must be an object");

  const appPassword = readOptionalString(payload.provision.appPassword, "provision.appPassword", 128);
  if (appPassword && appPassword.length < 8) {
    throw new HttpError(400, "provision.appPassword must be at least 8 characters");
  }

  return {
    pgAdmin: readPgAdmin(payload.pgAdmin),
    provision: {
      dbName: readIdentifier(payload.provision.dbName, "provision.dbName"),
      appRole: readIdentifier(payload.provision.appRole, "provision.appRole"),
      appPassword,
    },
  };
}

function toPgSslMode(sslMode: SslMode): false | { rejectUnauthorized: false } {
  if (sslMode === "require") {
    return { rejectUnauthorized: false };
  }
  return false;
}

function buildAdminClient(pgAdmin: SetupPgAdminInput, database: string): Client {
  return new Client({
    host: pgAdmin.host,
    port: pgAdmin.port,
    user: pgAdmin.user,
    password: pgAdmin.password,
    database,
    ssl: toPgSslMode(pgAdmin.sslMode),
  });
}

function quoteIdentifier(identifier: string): string {
  return escapeIdentifier(identifier);
}

export function buildDatabaseUrl(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslMode: SslMode;
}): string {
  const params = new URLSearchParams();
  params.set("schema", "public");
  if (config.sslMode === "require") {
    params.set("sslmode", "require");
  }

  return `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${encodeURIComponent(config.database)}?${params.toString()}`;
}

export function generateAppPassword(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function runPrismaMigrateDeploy(databaseUrl: string): Promise<void> {
  const localPrismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  const command = process.env.NODE_ENV === "production" ? "prisma" : localPrismaBin;
  try {
    await execFileAsync(command, ["migrate", "deploy"], {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
  } catch (error) {
    // Fallback to local binary when global prisma is unavailable in non-production shells.
    if (command !== localPrismaBin) {
      try {
        await execFileAsync(localPrismaBin, ["migrate", "deploy"], {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
          },
        });
        return;
      } catch {
        // Keep original error handling below.
      }
    }

    const message =
      error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr.trim()
        : "Failed to apply prisma migrations";
    throw new HttpError(500, message || "Failed to apply prisma migrations");
  }
}

async function ensureRole(adminClient: Client, appRole: string, appPassword: string, mode: SetupMode): Promise<void> {
  const existingRole = await adminClient.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [appRole]);

  if (existingRole.rowCount === 0) {
    if (mode === "recovery") {
      throw new HttpError(404, `Application role \"${appRole}\" was not found`);
    }
    await adminClient.query(
      `CREATE ROLE ${quoteIdentifier(appRole)} LOGIN PASSWORD $1`,
      [appPassword],
    );
    return;
  }

  await adminClient.query(
    `ALTER ROLE ${quoteIdentifier(appRole)} WITH LOGIN PASSWORD $1`,
    [appPassword],
  );
}

async function ensureDatabase(adminClient: Client, dbName: string, appRole: string, mode: SetupMode): Promise<void> {
  const existingDb = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);

  if (existingDb.rowCount === 0) {
    if (mode === "recovery") {
      throw new HttpError(404, `Database \"${dbName}\" was not found`);
    }

    await adminClient.query(
      `CREATE DATABASE ${quoteIdentifier(dbName)} OWNER ${quoteIdentifier(appRole)}`,
    );
  }

  await adminClient.query(
    `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(appRole)}`,
  );
}

async function grantSchemaPrivileges(
  pgAdmin: SetupPgAdminInput,
  dbName: string,
  appRole: string,
): Promise<void> {
  const dbAdminClient = buildAdminClient(pgAdmin, dbName);
  await dbAdminClient.connect();

  try {
    const role = quoteIdentifier(appRole);

    await dbAdminClient.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${role}`);
    await dbAdminClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${role}`);
    await dbAdminClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await dbAdminClient.query(`GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO ${role}`);
    await dbAdminClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${role}`,
    );
    await dbAdminClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${role}`,
    );
    await dbAdminClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON ROUTINES TO ${role}`,
    );
  } finally {
    await dbAdminClient.end().catch(() => undefined);
  }
}

async function countExistingUsers(databaseUrl: string): Promise<number> {
  const appClient = new Client({ connectionString: databaseUrl });
  await appClient.connect();

  try {
    const tableCheck = await appClient.query<{ rel: string | null }>(
      `SELECT to_regclass('public."User"')::text AS rel`,
    );

    if (!tableCheck.rows[0]?.rel) {
      return 0;
    }

    const countResult = await appClient.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "User"');
    return Number(countResult.rows[0]?.count ?? "0");
  } finally {
    await appClient.end().catch(() => undefined);
  }
}

type SetupMode = "setup" | "recovery";

interface ProvisionResult {
  databaseUrl: string;
  appRole: string;
  appPassword: string;
  usersCount: number;
}

export async function provisionDatabase(
  input: SetupRunInput | SetupRecoverInput,
  mode: SetupMode,
): Promise<ProvisionResult> {
  const appPassword = input.provision.appPassword ?? generateAppPassword();
  const adminClient = buildAdminClient(input.pgAdmin, "postgres");

  await adminClient.connect();

  try {
    await ensureRole(adminClient, input.provision.appRole, appPassword, mode);
    await ensureDatabase(adminClient, input.provision.dbName, input.provision.appRole, mode);
  } finally {
    await adminClient.end().catch(() => undefined);
  }

  await grantSchemaPrivileges(input.pgAdmin, input.provision.dbName, input.provision.appRole);

  const databaseUrl = buildDatabaseUrl({
    host: input.pgAdmin.host,
    port: input.pgAdmin.port,
    database: input.provision.dbName,
    user: input.provision.appRole,
    password: appPassword,
    sslMode: input.pgAdmin.sslMode,
  });

  await runPrismaMigrateDeploy(databaseUrl);
  const usersCount = await countExistingUsers(databaseUrl);

  return {
    databaseUrl,
    appRole: input.provision.appRole,
    appPassword,
    usersCount,
  };
}

export async function createInitialUserInDatabase(
  databaseUrl: string,
  siteAdmin: SetupSiteAdminInput,
): Promise<{ email: string }> {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      throw new HttpError(409, "Users already exist in the selected database");
    }

    const passwordHash = await hashPassword(siteAdmin.password);
    const createdUser = await prisma.user.create({
      data: {
        email: siteAdmin.email.toLowerCase(),
        name: siteAdmin.name.trim(),
        passwordHash,
      },
    });

    await prisma.event.createMany({
      data: mockEvents.map((event) => ({
        userId: createdUser.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        status: event.status ?? "pending",
      })),
    });

    return { email: createdUser.email };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

export function buildSetupSummary(input: {
  databaseUrl: string;
  appRole: string;
  appPassword: string;
  initialUserEmail?: string;
}): SetupSummary {
  return {
    databaseUrl: input.databaseUrl,
    appRole: input.appRole,
    appPassword: input.appPassword,
    sessionSecret: generateSessionSecret(),
    initialUserEmail: input.initialUserEmail,
  };
}
