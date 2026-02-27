export type EventType = "event" | "task";
export type EventStatus = "pending" | "done";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";
export type RecurrenceScope = "this" | "all" | "this_and_following";

export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  count?: number;
  until?: string; // ISO date string YYYY-MM-DD
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  time?: string; // HH:MM
  type: EventType;
  status?: EventStatus;
  recurrenceSeriesId?: string;
  recurrenceException?: boolean;
  recurrence?: EventRecurrence;
}

export interface PersistedEvent extends CalendarEvent {
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface PersistedUser extends AuthUser {
  passwordHash: string;
}

export interface CreateEventInput {
  title: string;
  type: EventType;
  date: string;
  time?: string;
  description: string;
  status?: EventStatus;
  recurrence?: EventRecurrence;
}

export interface UpdateEventInput {
  id: string;
  title?: string;
  type?: EventType;
  date?: string;
  time?: string;
  description?: string;
  status?: EventStatus;
  recurrenceScope?: RecurrenceScope;
}

export interface EventListFilters {
  q?: string;
  type?: EventType;
  status?: EventStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ApiErrorResponse {
  message: string;
}

export type SslMode = "disable" | "require";

export interface SetupPgAdminInput {
  host: string;
  port: number;
  user: string;
  password: string;
  sslMode: SslMode;
}

export interface SetupProvisionInput {
  dbName: string;
  appRole: string;
  appPassword?: string;
}

export interface SetupSiteAdminInput {
  name: string;
  email: string;
  password: string;
}

export interface SetupRunInput {
  pgAdmin: SetupPgAdminInput;
  provision: SetupProvisionInput;
  siteAdmin: SetupSiteAdminInput;
}

export interface SetupRecoverInput {
  pgAdmin: SetupPgAdminInput;
  provision: SetupProvisionInput;
}

export interface SetupSummary {
  databaseUrl: string;
  appRole: string;
  appPassword: string;
  sessionSecret: string;
  initialUserEmail?: string;
}

export interface SetupRunResponse {
  ok: true;
  generated: SetupSummary;
}

export interface SetupRecoverResponse {
  ok: true;
  recovered: SetupSummary;
}

export interface SetupErrorResponse {
  error: string;
  needsRecovery?: boolean;
  recoveryEndpoint?: string;
}
