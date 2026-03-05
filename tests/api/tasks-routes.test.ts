import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: vi.fn(() => "u1"),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  getRateLimitResponse: vi.fn(async () => null),
}));

vi.mock("@/lib/server/tasks-db", () => ({
  listTasksForUser: vi.fn(async () => [{ id: "t1", title: "Задача" }]),
  createTaskForUser: vi.fn(async () => ({ id: "t2", title: "Новая" })),
  updateTaskForUser: vi.fn(async () => ({ id: "t1", status: "done" })),
  panicResetTasksForUser: vi.fn(async () => ({ moved: 2, fromDate: "2026-03-05", toDate: "2026-03-06" })),
  listSubtasksForTask: vi.fn(async () => [{ id: "s1", title: "Шаг" }]),
  createSubtaskForTask: vi.fn(async () => ({ id: "s2", title: "Новый шаг" })),
  updateSubtaskForUser: vi.fn(async () => ({ id: "s1", status: "done" })),
}));

import { GET as GET_TASKS, POST as POST_TASKS } from "@/app/api/tasks/route";
import { PATCH as PATCH_TASK } from "@/app/api/tasks/[id]/route";
import { POST as POST_PANIC_RESET } from "@/app/api/tasks/panic-reset/route";
import { GET as GET_SUBTASKS, POST as POST_SUBTASKS } from "@/app/api/tasks/[id]/subtasks/route";
import { PATCH as PATCH_SUBTASK } from "@/app/api/subtasks/[id]/route";

describe("tasks routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/tasks returns tasks", async () => {
    const request = new NextRequest("http://localhost/api/tasks");
    const response = await GET_TASKS(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ tasks: [{ id: "t1", title: "Задача" }] });
  });

  it("POST /api/tasks creates task", async () => {
    const request = new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Новая" }),
    });

    const response = await POST_TASKS(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.id).toBe("t2");
  });

  it("PATCH /api/tasks/:id updates task", async () => {
    const request = new NextRequest("http://localhost/api/tasks/t1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });

    const response = await PATCH_TASK(request, { params: Promise.resolve({ id: "t1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("done");
  });

  it("POST /api/tasks/panic-reset returns summary", async () => {
    const request = new NextRequest("http://localhost/api/tasks/panic-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromDate: "2026-03-05" }),
    });

    const response = await POST_PANIC_RESET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.moved).toBe(2);
  });

  it("GET /api/tasks/:id/subtasks returns subtasks", async () => {
    const request = new NextRequest("http://localhost/api/tasks/t1/subtasks");

    const response = await GET_SUBTASKS(request, { params: Promise.resolve({ id: "t1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.subtasks).toHaveLength(1);
  });

  it("POST /api/tasks/:id/subtasks creates subtask", async () => {
    const request = new NextRequest("http://localhost/api/tasks/t1/subtasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Новый шаг" }),
    });

    const response = await POST_SUBTASKS(request, { params: Promise.resolve({ id: "t1" }) });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.id).toBe("s2");
  });

  it("PATCH /api/subtasks/:id updates subtask", async () => {
    const request = new NextRequest("http://localhost/api/subtasks/s1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });

    const response = await PATCH_SUBTASK(request, { params: Promise.resolve({ id: "s1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("done");
  });
});
