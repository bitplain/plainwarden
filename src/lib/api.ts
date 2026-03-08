import {
  ConvertInboxItemInput,
  CreateInboxItemInput,
  InboxAiAnalysis,
  AuthResponse,
  CalendarEvent,
  CreateEventInput,
  CreateNoteInput,
  CreateSubtaskInput,
  CreateTaskInput,
  InboxItem,
  RecurrenceScope,
  LoginInput,
  StatsDaily,
  StatsWeekly,
  Subtask,
  Task,
  Note,
  NoteListFilters,
  NoteVersion,
  RegisterInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
  UpdateEventInput,
  UpdateNoteInput,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanComment,
  KanbanWorklog,
  KanbanDependency,
  CreateKanbanBoardInput,
  UpdateKanbanBoardInput,
  CreateKanbanColumnInput,
  UpdateKanbanColumnInput,
  CreateKanbanCardInput,
  UpdateKanbanCardInput,
  MoveKanbanCardInput,
  CreateKanbanChecklistInput,
  CreateKanbanChecklistItemInput,
  UpdateKanbanChecklistItemInput,
  CreateKanbanCommentInput,
  UpdateKanbanCommentInput,
  CreateKanbanWorklogInput,
  AddKanbanDependencyInput,
} from "@/lib/types";
import { buildEventListQueryString } from "@/lib/event-filter-query";
import type { EventListFilters } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;

      try {
        const body = (await response.json()) as { message?: string; error?: string };
        if (body.message) {
          message = body.message;
        } else if (body.error) {
          message = body.error;
        }
      } catch {
        // Keep default message for non-json errors.
      }

      if (typeof window !== "undefined" && response.status === 401) {
        const isAuthEndpoint = endpoint.startsWith("/auth/");
        if (!isAuthEndpoint) {
          const currentPath = window.location.pathname;
          const loginUrl = new URL("/login", window.location.origin);
          if (currentPath !== "/login") {
            loginUrl.searchParams.set("from", currentPath);
          }
          loginUrl.searchParams.set("reason", "session");
          window.location.assign(loginUrl.toString());
        }
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async getEvents(filters: EventListFilters = {}): Promise<CalendarEvent[]> {
    const query = buildEventListQueryString(filters);
    const endpoint = query ? `/events?${query}` : "/events";
    return this.request<CalendarEvent[]>(endpoint);
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    return this.request<CalendarEvent>("/events", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    const { id, ...payload } = input;
    return this.request<CalendarEvent>(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async deleteEvent(id: string, options: { recurrenceScope?: RecurrenceScope } = {}): Promise<void> {
    const query = options.recurrenceScope ? `?scope=${options.recurrenceScope}` : "";
    await this.request<{ success: boolean }>(`/events/${id}${query}`, {
      method: "DELETE",
    });
  }

  async listInbox(status?: "new" | "processed" | "archived"): Promise<InboxItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const payload = await this.request<{ items: InboxItem[] }>(`/inbox${query}`);
    return payload.items;
  }

  async createInboxItem(input: CreateInboxItemInput): Promise<InboxItem> {
    return this.request<InboxItem>("/inbox", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async convertInboxItem(id: string, input: ConvertInboxItemInput): Promise<{
    item: InboxItem;
    converted: { type: "task" | "event" | "note"; id: string };
  }> {
    return this.request(`/inbox/${id}/convert`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async archiveInboxItem(id: string): Promise<InboxItem> {
    return this.request<InboxItem>(`/inbox/${id}/archive`, {
      method: "POST",
    });
  }

  async analyzeInboxItem(id: string): Promise<InboxAiAnalysis> {
    return this.request<InboxAiAnalysis>(`/inbox/${id}/ai`, {
      method: "POST",
      headers: {
        "x-netden-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      body: JSON.stringify({}),
    });
  }

  async listTasks(filters: {
    q?: string;
    status?: "todo" | "in_progress" | "blocked" | "done";
    dueDate?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.dueDate) params.set("dueDate", filters.dueDate);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    const query = params.toString();
    const payload = await this.request<{ tasks: Task[] }>(query ? `/tasks?${query}` : "/tasks");
    return payload.tasks;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async panicResetTasks(fromDate?: string): Promise<{ moved: number; fromDate: string; toDate: string }> {
    return this.request("/tasks/panic-reset", {
      method: "POST",
      body: JSON.stringify({ fromDate }),
    });
  }

  async listSubtasks(taskId: string): Promise<Subtask[]> {
    const payload = await this.request<{ subtasks: Subtask[] }>(`/tasks/${taskId}/subtasks`);
    return payload.subtasks;
  }

  async createSubtask(taskId: string, input: CreateSubtaskInput): Promise<Subtask> {
    return this.request<Subtask>(`/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateSubtask(id: string, input: UpdateSubtaskInput): Promise<Subtask> {
    return this.request<Subtask>(`/subtasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async getDailyStats(date?: string): Promise<StatsDaily> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<StatsDaily>(`/stats/daily${query}`);
  }

  async getWeeklyStats(date?: string): Promise<StatsWeekly> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<StatsWeekly>(`/stats/weekly${query}`);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async logout(): Promise<void> {
    await this.request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  }

  async me(): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/me", {
      method: "GET",
    });
  }

  async getNotes(filters: NoteListFilters = {}): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.parentId !== undefined) params.set("parentId", filters.parentId);
    const qs = params.toString();
    return this.request<Note[]>(qs ? `/notes?${qs}` : "/notes");
  }

  async getNote(id: string): Promise<Note> {
    return this.request<Note>(`/notes/${id}`);
  }

  async createNote(input: CreateNoteInput): Promise<Note> {
    return this.request<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
    return this.request<Note>(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<void>(`/notes/${id}`, { method: "DELETE" });
  }

  async getNoteHistory(id: string): Promise<NoteVersion[]> {
    return this.request<NoteVersion[]>(`/notes/${id}/history`);
  }

  async restoreNoteVersion(noteId: string, versionId: string): Promise<Note> {
    return this.request<Note>(`/notes/${noteId}/restore`, {
      method: "POST",
      body: JSON.stringify({ versionId }),
    });
  }

  getNoteExportUrl(id: string): string {
    return `${this.baseUrl}/notes/${id}/export`;
  }

  // ── Kanban ──────────────────────────────────────────────────────────────────

  async listBoards(): Promise<KanbanBoard[]> {
    return this.request<KanbanBoard[]>("/kanban/boards");
  }

  async getBoard(boardId: string): Promise<KanbanBoard> {
    return this.request<KanbanBoard>(`/kanban/boards/${boardId}`);
  }

  async createBoard(input: CreateKanbanBoardInput): Promise<KanbanBoard> {
    return this.request<KanbanBoard>("/kanban/boards", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateBoard(boardId: string, input: UpdateKanbanBoardInput): Promise<KanbanBoard> {
    return this.request<KanbanBoard>(`/kanban/boards/${boardId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.request<void>(`/kanban/boards/${boardId}`, { method: "DELETE" });
  }

  async createColumn(boardId: string, input: CreateKanbanColumnInput): Promise<KanbanColumn> {
    return this.request<KanbanColumn>(`/kanban/boards/${boardId}/columns`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateColumn(columnId: string, input: UpdateKanbanColumnInput): Promise<KanbanColumn> {
    return this.request<KanbanColumn>(`/kanban/columns/${columnId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.request<void>(`/kanban/columns/${columnId}`, { method: "DELETE" });
  }

  async listCardsInColumn(columnId: string): Promise<KanbanCard[]> {
    return this.request<KanbanCard[]>(`/kanban/columns/${columnId}/cards`);
  }

  async createCard(columnId: string, input: CreateKanbanCardInput): Promise<KanbanCard> {
    return this.request<KanbanCard>(`/kanban/columns/${columnId}/cards`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getCard(cardId: string): Promise<KanbanCard> {
    return this.request<KanbanCard>(`/kanban/cards/${cardId}`);
  }

  async updateCard(cardId: string, input: UpdateKanbanCardInput): Promise<KanbanCard> {
    return this.request<KanbanCard>(`/kanban/cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.request<void>(`/kanban/cards/${cardId}`, { method: "DELETE" });
  }

  async moveCard(cardId: string, input: MoveKanbanCardInput): Promise<KanbanCard> {
    return this.request<KanbanCard>(`/kanban/cards/${cardId}/move`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listChecklists(cardId: string): Promise<KanbanChecklist[]> {
    return this.request<KanbanChecklist[]>(`/kanban/cards/${cardId}/checklists`);
  }

  async createChecklist(cardId: string, input: CreateKanbanChecklistInput): Promise<KanbanChecklist> {
    return this.request<KanbanChecklist>(`/kanban/cards/${cardId}/checklists`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createChecklistItem(checklistId: string, input: CreateKanbanChecklistItemInput): Promise<KanbanChecklistItem> {
    return this.request<KanbanChecklistItem>(`/kanban/checklists/${checklistId}/items`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateChecklistItem(itemId: string, input: UpdateKanbanChecklistItemInput): Promise<KanbanChecklistItem> {
    return this.request<KanbanChecklistItem>(`/kanban/checklist-items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async listComments(cardId: string): Promise<KanbanComment[]> {
    return this.request<KanbanComment[]>(`/kanban/cards/${cardId}/comments`);
  }

  async createComment(cardId: string, input: CreateKanbanCommentInput): Promise<KanbanComment> {
    return this.request<KanbanComment>(`/kanban/cards/${cardId}/comments`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateComment(commentId: string, input: UpdateKanbanCommentInput): Promise<KanbanComment> {
    return this.request<KanbanComment>(`/kanban/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.request<void>(`/kanban/comments/${commentId}`, { method: "DELETE" });
  }

  async listWorklogs(cardId: string): Promise<KanbanWorklog[]> {
    return this.request<KanbanWorklog[]>(`/kanban/cards/${cardId}/worklog`);
  }

  async addWorklog(cardId: string, input: CreateKanbanWorklogInput): Promise<KanbanWorklog> {
    return this.request<KanbanWorklog>(`/kanban/cards/${cardId}/worklog`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async startTimer(cardId: string): Promise<KanbanWorklog> {
    return this.request<KanbanWorklog>(`/kanban/cards/${cardId}/worklog/start`, {
      method: "POST",
    });
  }

  async stopTimer(cardId: string, note?: string): Promise<KanbanWorklog> {
    return this.request<KanbanWorklog>(`/kanban/cards/${cardId}/worklog/stop`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async listDependencies(cardId: string): Promise<KanbanDependency[]> {
    return this.request<KanbanDependency[]>(`/kanban/cards/${cardId}/dependencies`);
  }

  async addDependency(cardId: string, input: AddKanbanDependencyInput): Promise<KanbanDependency> {
    return this.request<KanbanDependency>(`/kanban/cards/${cardId}/dependencies`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async removeDependency(cardId: string, depId: string): Promise<void> {
    await this.request<void>(`/kanban/cards/${cardId}/dependencies/${depId}`, {
      method: "DELETE",
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
