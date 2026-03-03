import crypto from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Client, escapeIdentifier } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";
import { mockEvents } from "@/lib/mock-data";
import {
  SetupConnectionMode,
  SetupEmergencyAccountOption,
  SetupEmergencyResetInput,
  SetupErrorReasonCode,
  SetupErrorResponse,
  SetupPgAdminInput,
  SetupPresetResponse,
  SetupRecoverInput,
  SetupRunInput,
  SetupSiteAdminInput,
  SetupStateReason,
  SetupStateResponse,
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

function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { code?: unknown; originalCode?: unknown; cause?: unknown };
  if (typeof candidate.code === "string" && candidate.code) {
    return candidate.code;
  }
  if (typeof candidate.originalCode === "string" && candidate.originalCode) {
    return candidate.originalCode;
  }
  if (candidate.cause) {
    return readErrorCode(candidate.cause);
  }
  return undefined;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  if (typeof error === "string") {
    return error.toLowerCase();
  }
  return "";
}

function isSchemaNotReadyError(error: unknown): boolean {
  const code = readErrorCode(error);
  return code === "P2021" || code === "P2022" || code === "42P01";
}

function isDatabaseUnreachableError(error: unknown): boolean {
  const code = readErrorCode(error);
  if (
    code === "P1001" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }

  const message = readErrorMessage(error);
  return (
    message.includes("can't reach database server") ||
    message.includes("connection refused") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("connect etimedout") ||
    message.includes("getaddrinfo enotfound")
  );
}

function inferSetupErrorReasonCode(error: unknown): SetupErrorReasonCode | undefined {
  if (isSchemaNotReadyError(error)) {
    return "schema_not_ready";
  }
  if (isDatabaseUnreachableError(error)) {
    return "db_unreachable";
  }
  return undefined;
}

export function detectSetupStateReason(error: unknown): SetupStateReason {
  if (isSchemaNotReadyError(error)) {
    return "schema_not_ready";
  }
  return "db_unreachable";
}

function readEnv(name: string): string | undefined {
  const value = normalize(process.env[name]);
  return value || undefined;
}

function readEnvPort(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }

  return parsed;
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

export function validateSetupEmergencyFactoryResetInput(payload: unknown): void {
  assertRecord(payload);

  const confirmText = readRequiredString(payload.confirmText, "confirmText", 64);
  if (confirmText !== "RESET ALL DATA") {
    throw new HttpError(400, "confirmText must be exactly 'RESET ALL DATA'");
  }
}

export function validateSetupRunInput(payload: unknown): SetupRunInput {
  assertRecord(payload);
  assertRecord(payload.provision, "provision must be an object");
  assertRecord(payload.siteAdmin, "siteAdmin must be an object");

  const appPassword = readOptionalString(payload.provision.appPassword, "provision.appPassword", 128);
  if (appPassword && appPassword.length < 12) {
    throw new HttpError(400, "provision.appPassword must be at least 12 characters");
  }

  const siteAdmin: SetupSiteAdminInput = {
    name: readRequiredString(payload.siteAdmin.name, "siteAdmin.name", 100),
    email: readEmail(payload.siteAdmin.email, "siteAdmin.email"),
    password: readRequiredString(payload.siteAdmin.password, "siteAdmin.password", 256),
  };

  if (siteAdmin.password.length < 12) {
    throw new HttpError(400, "siteAdmin.password must be at least 12 characters");
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

  let accountRecovery: SetupRecoverInput["accountRecovery"];
  if (payload.accountRecovery !== undefined && payload.accountRecovery !== null) {
    assertRecord(payload.accountRecovery, "accountRecovery must be an object");
    const email = readEmail(payload.accountRecovery.email, "accountRecovery.email");
    const password = readRequiredString(
      payload.accountRecovery.password,
      "accountRecovery.password",
      256,
    );

    if (password.length < 12) {
      throw new HttpError(400, "accountRecovery.password must be at least 12 characters");
    }

    accountRecovery = { email, password };
  }

  const appPassword = readOptionalString(payload.provision.appPassword, "provision.appPassword", 128);
  if (appPassword && appPassword.length < 12) {
    throw new HttpError(400, "provision.appPassword must be at least 12 characters");
  }

  return {
    pgAdmin: readPgAdmin(payload.pgAdmin),
    provision: {
      dbName: readIdentifier(payload.provision.dbName, "provision.dbName"),
      appRole: readIdentifier(payload.provision.appRole, "provision.appRole"),
      appPassword,
    },
    accountRecovery,
  };
}

function toPgSslMode(sslMode: SslMode): false | { rejectUnauthorized: false } {
  if (sslMode === "require") {
    // rejectUnauthorized: false is intentional — the setup wizard targets self-hosted
    // PostgreSQL instances that commonly use self-signed certificates. Users who need
    // strict certificate verification should use a properly-signed certificate and set
    // sslMode to something other than "require" at the OS/pg_hba level.
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

export function getManualSetupPreset(mode: SetupConnectionMode): SetupPresetResponse {
  if (mode === "remote") {
    return {
      mode,
      pgAdmin: {
        host: "",
        port: 5432,
        user: "",
        password: "",
        sslMode: "require",
      },
      provision: {
        dbName: "",
        appRole: "",
        appPassword: undefined,
      },
    };
  }

  return {
    mode,
    pgAdmin: {
      host: "postgres",
      port: 5432,
      user: "netden",
      password: "netdenpass",
      sslMode: "disable",
    },
    provision: {
      dbName: "netden",
      appRole: "netden_app",
      appPassword: undefined,
    },
  };
}

export function getSetupPreset(mode: SetupConnectionMode): SetupPresetResponse {
  if (mode === "remote") {
    return getManualSetupPreset(mode);
  }

  const manual = getManualSetupPreset("docker");

  return {
    mode,
    pgAdmin: {
      host: readEnv("POSTGRES_HOST") ?? manual.pgAdmin.host,
      port: readEnvPort("POSTGRES_PORT", manual.pgAdmin.port),
      user: readEnv("POSTGRES_USER") ?? manual.pgAdmin.user,
      password: readEnv("POSTGRES_PASSWORD") ?? manual.pgAdmin.password,
      sslMode: manual.pgAdmin.sslMode,
    },
    provision: {
      dbName: readEnv("POSTGRES_DB") ?? manual.provision.dbName,
      appRole: manual.provision.appRole,
      appPassword: generateAppPassword(),
    },
  };
}

export function maskEmailForRecovery(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localRaw, domainRaw] = normalized.split("@");
  if (!localRaw || !domainRaw) {
    return "***";
  }

  const domainParts = domainRaw.split(".");
  const host = domainParts.shift() ?? "";
  const suffix = domainParts.length > 0 ? `.${domainParts.join(".")}` : "";

  const maskedLocal = `${localRaw[0] ?? "*"}***`;
  const maskedHost = `${host[0] ?? "*"}***`;
  return `${maskedLocal}@${maskedHost}${suffix}`;
}

export function validateSetupEmergencyResetInput(payload: unknown): SetupEmergencyResetInput {
  assertRecord(payload);

  const userId = readRequiredString(payload.userId, "userId", 255);
  const newPassword = readRequiredString(payload.newPassword, "newPassword", 256);
  if (newPassword.length < 12) {
    throw new HttpError(400, "newPassword must be at least 12 characters");
  }

  return {
    userId,
    newPassword,
  };
}

export async function listEmergencyRecoveryAccounts(): Promise<SetupEmergencyAccountOption[]> {
  const { default: prisma } = await import("@/lib/server/prisma");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return users.map((user) => ({
    userId: user.id,
    maskedEmail: maskEmailForRecovery(user.email),
  }));
}

export async function resetEmergencyPasswordByUserId(input: SetupEmergencyResetInput): Promise<{ email: string }> {
  const { default: prisma } = await import("@/lib/server/prisma");
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return { email: user.email };
}

function isMissingTableError(error: unknown): boolean {
  return readErrorCode(error) === "P2021";
}

async function cleanupOptionalTable(
  label: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`Emergency factory reset: skip missing table ${label}`);
      return;
    }
    throw error;
  }
}

export async function runEmergencyFactoryReset(): Promise<void> {
  const { default: prisma } = await import("@/lib/server/prisma");
  await prisma.user.deleteMany();

  // Optional tables may be absent in legacy databases. Missing table should not
  // block reset-to-register flow.
  await cleanupOptionalTable("ItemLink", () => prisma.itemLink.deleteMany());
  await cleanupOptionalTable("AiActionLog", () => prisma.aiActionLog.deleteMany());
  await cleanupOptionalTable("RateLimitBucket", () => prisma.rateLimitBucket.deleteMany());
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function readSetupState(): Promise<SetupStateResponse> {
  const databaseConfigured = isDatabaseConfigured();
  if (!databaseConfigured) {
    return {
      databaseConfigured: false,
      initialized: false,
      setupRequired: true,
    };
  }

  try {
    const { hasUsers } = await import("@/lib/server/json-db");
    const initialized = await hasUsers();
    return {
      databaseConfigured: true,
      initialized,
      setupRequired: !initialized,
    };
  } catch (error) {
    const reason = detectSetupStateReason(error);
    console.error("Failed to read setup state:", error);
    return {
      databaseConfigured: true,
      initialized: false,
      setupRequired: true,
      degraded: true,
      reason,
    };
  }
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

export async function resetUserPasswordInDatabase(
  databaseUrl: string,
  accountRecovery: NonNullable<SetupRecoverInput["accountRecovery"]>,
): Promise<{ email: string }> {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const targetEmail = accountRecovery.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new HttpError(404, `User with email \"${targetEmail}\" was not found`);
    }

    const passwordHash = await hashPassword(accountRecovery.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return { email: user.email };
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

export function handleSetupError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    const body: SetupErrorResponse = {
      error: error.message,
      reasonCode: inferSetupErrorReasonCode(error),
    };
    return NextResponse.json(body, { status: error.status });
  }

  const inferredReason = inferSetupErrorReasonCode(error);
  if (inferredReason === "schema_not_ready") {
    const body: SetupErrorResponse = {
      error: "Database schema is not ready. Complete setup with infrastructure access.",
      reasonCode: inferredReason,
    };
    return NextResponse.json(body, { status: 409 });
  }
  if (inferredReason === "db_unreachable") {
    const body: SetupErrorResponse = {
      error: "Database is unreachable. Check DATABASE_URL and PostgreSQL network access.",
      reasonCode: inferredReason,
    };
    return NextResponse.json(body, { status: 503 });
  }

  console.error("Unhandled setup error:", error);
  const body: SetupErrorResponse = {
    error: "Internal server error",
    reasonCode: "internal_server_error",
  };
  return NextResponse.json(body, { status: 500 });
}
