import {
  AuthResponse,
  CalendarEvent,
  CreateEventInput,
  RecurrenceScope,
  LoginInput,
  RegisterInput,
  UpdateEventInput,
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
        const body = (await response.json()) as { message?: string };
        if (body.message) {
          message = body.message;
        }
      } catch {
        // Keep default message for non-json errors.
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
}

export const api = new ApiClient(API_BASE_URL);
