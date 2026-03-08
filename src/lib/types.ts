export type EventType = "event" | "task";
export type EventStatus = "pending" | "done";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";
export type RecurrenceScope = "this" | "all" | "this_and_following";
export type InboxItemStatus = "new" | "processed" | "archived";
export type InboxTypeHint = "idea" | "task" | "note" | "link";
export type InboxConvertedEntityType = "task" | "event" | "note";
export type InboxAiRecommendedTarget = InboxConvertedEntityType | "keep";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskProgressMode = "subtasks" | "manual";
export type SubtaskStatus = "todo" | "doing" | "done";
export type SubtaskCreatedBy = "user" | "ai";

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
  categoryId?: string;
  recurrenceSeriesId?: string;
  recurrenceException?: boolean;
  recurrence?: EventRecurrence;
  revision?: number;
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
  categoryId?: string;
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
  categoryId?: string;
  recurrence?: EventRecurrence;
  recurrenceScope?: RecurrenceScope;
  revision?: number;
}

export interface InboxItem {
  id: string;
  userId: string;
  content: string;
  typeHint: InboxTypeHint;
  status: InboxItemStatus;
  convertedToEntityType?: InboxConvertedEntityType;
  convertedToEntityId?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  archivedAt?: string;
}

export interface CreateInboxItemInput {
  content: string;
  typeHint?: InboxTypeHint;
}

export interface ConvertInboxItemInput {
  target: InboxConvertedEntityType;
  dueDate?: string;
  date?: string;
  isPriority?: boolean;
}

export interface InboxAiAnalysis {
  itemId: string;
  summary: string;
  recommendedTarget: InboxAiRecommendedTarget;
  rationale: string[];
  suggestedDate?: string;
  suggestedDueDate?: string;
  suggestedPriority?: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  progressMode: TaskProgressMode;
  manualProgress: number;
  dueDate?: string;
  isPriority: boolean;
  linkedEventId?: string;
  sourceInboxItemId?: string;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  subtasksTotal: number;
  subtasksDone: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  progressMode?: TaskProgressMode;
  manualProgress?: number;
  dueDate?: string;
  isPriority?: boolean;
  sourceInboxItemId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  progressMode?: TaskProgressMode;
  manualProgress?: number;
  dueDate?: string | null;
  isPriority?: boolean;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  position: number;
  status: SubtaskStatus;
  estimateMin?: number;
  createdBy: SubtaskCreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubtaskInput {
  title: string;
  position?: number;
  estimateMin?: number;
  createdBy?: SubtaskCreatedBy;
}

export interface UpdateSubtaskInput {
  title?: string;
  position?: number;
  status?: SubtaskStatus;
  estimateMin?: number | null;
}

export interface StatsDaily {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
  habitsCompleted: number;
  overdueCount: number;
  priorityPlanned: number;
}

export interface StatsWeekly {
  weekStart: string;
  weekEnd: string;
  tasksCompleted: number;
  focusMinutes: number;
  habitsCompleted: number;
  overdueCount: number;
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

export interface NoteRef {
  id: string;
  title: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  parentId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  children?: NoteRef[];
  backlinks?: NoteRef[];
  eventLinks?: string[];
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface CreateNoteInput {
  title: string;
  body?: string;
  parentId?: string;
  tags?: string[];
  eventLinks?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  parentId?: string | null;
  tags?: string[];
  eventLinks?: string[];
}

export interface NoteListFilters {
  q?: string;
  tag?: string;
  parentId?: string;
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

export interface KanbanBoard {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  columns?: KanbanColumn[];
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  position: number;
  wipLimit?: number;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  cards?: KanbanCardRef[];
}

export interface KanbanCardRef {
  id: string;
  title: string;
  position: number;
}

export interface KanbanCard {
  id: string;
  boardId: string;
  columnId: string;
  userId: string;
  title: string;
  description: string;
  position: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  checklists?: KanbanChecklist[];
  totalTimeSeconds?: number;
  activeWorklogId?: string;
  dependencyIds?: string[];
  eventLinks?: string[];
}

export interface KanbanChecklist {
  id: string;
  cardId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  items?: KanbanChecklistItem[];
}

export interface KanbanChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanComment {
  id: string;
  cardId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanWorklog {
  id: string;
  cardId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  note: string;
  createdAt: string;
}

export interface KanbanDependency {
  id: string;
  cardId: string;
  dependsOnId: string;
}

export interface CreateKanbanBoardInput {
  title: string;
}

export interface UpdateKanbanBoardInput {
  title?: string;
}

export interface CreateKanbanColumnInput {
  title: string;
  position: number;
  wipLimit?: number;
  isDone?: boolean;
}

export interface UpdateKanbanColumnInput {
  title?: string;
  position?: number;
  wipLimit?: number | null;
  isDone?: boolean;
}

export interface CreateKanbanCardInput {
  title: string;
  description?: string;
  position: number;
  dueDate?: string;
  eventLinks?: string[];
}

export interface UpdateKanbanCardInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  eventLinks?: string[];
}

export interface MoveKanbanCardInput {
  columnId: string;
  position: number;
}

export interface CreateKanbanChecklistInput {
  title: string;
}

export interface UpdateKanbanChecklistInput {
  title?: string;
}

export interface CreateKanbanChecklistItemInput {
  text: string;
  position: number;
}

export interface UpdateKanbanChecklistItemInput {
  text?: string;
  completed?: boolean;
  position?: number;
}

export interface CreateKanbanCommentInput {
  body: string;
}

export interface UpdateKanbanCommentInput {
  body: string;
}

export interface CreateKanbanWorklogInput {
  startedAt: string;
  endedAt: string;
  note?: string;
}

export interface AddKanbanDependencyInput {
  dependsOnId: string;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export type SslMode = "disable" | "require";
export type SetupConnectionMode = "docker" | "remote";

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
  accountRecovery?: {
    email: string;
    password: string;
  };
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

export type SetupErrorReasonCode =
  | "database_url_configured"
  | "users_already_exist"
  | "database_not_configured"
  | "db_unreachable"
  | "schema_not_ready"
  | "legacy_endpoint_disabled"
  | "internal_server_error";

export interface SetupErrorResponse {
  error: string;
  needsRecovery?: boolean;
  recoveryEndpoint?: string;
  canFactoryReset?: boolean;
  canUseEmergencyRecovery?: boolean;
  reasonCode?: SetupErrorReasonCode;
}

export interface SetupPresetResponse {
  mode: SetupConnectionMode;
  pgAdmin: SetupPgAdminInput;
  provision: SetupProvisionInput;
}

export type SetupStateReason = "db_unreachable" | "schema_not_ready";

export interface SetupStateResponse {
  databaseConfigured: boolean;
  initialized: boolean;
  setupRequired: boolean;
  degraded?: boolean;
  reason?: SetupStateReason;
}

export interface SetupEmergencyAccountOption {
  userId: string;
  maskedEmail: string;
}

export interface SetupEmergencyStateResponse {
  ok: true;
  accounts: SetupEmergencyAccountOption[];
  legacyRecoveryEndpoint: string;
  warning: string;
}

export interface SetupEmergencyResetInput {
  userId: string;
  newPassword: string;
}

export interface SetupEmergencyResetResponse {
  ok: true;
  loginEmail: string;
}

export interface SetupEmergencyFactoryResetResponse {
  ok: true;
  next: "/register";
}
