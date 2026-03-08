import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { HttpError } from "@/lib/server/validators";

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(() => "u1"),
  getRateLimitResponse: vi.fn(async () => null),
  analyzeInboxItemForUser: vi.fn(async () => ({
    itemId: "i1",
    summary: "Похоже на событие с датой.",
    recommendedTarget: "event",
    rationale: ["Есть временная привязка."],
    suggestedDate: "2026-03-10",
  })),
}));

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  getRateLimitResponse: mocks.getRateLimitResponse,
}));

vi.mock("@/lib/server/inbox-ai", () => ({
  analyzeInboxItemForUser: mocks.analyzeInboxItemForUser,
}));

import { POST as POST_AI } from "@/app/api/inbox/[id]/ai/route";

describe("inbox ai route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserIdFromRequest.mockReturnValue("u1");
    mocks.getRateLimitResponse.mockResolvedValue(null);
    mocks.analyzeInboxItemForUser.mockResolvedValue({
      itemId: "i1",
      summary: "Похоже на событие с датой.",
      recommendedTarget: "event",
      rationale: ["Есть временная привязка."],
      suggestedDate: "2026-03-10",
    });
  });

  it("returns 401 when request is unauthorized", async () => {
    mocks.getUserIdFromRequest.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/inbox/i1/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST_AI(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe("Unauthorized");
  });

  it("returns 429 when rate limit blocks the request", async () => {
    mocks.getRateLimitResponse.mockResolvedValue(
      NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 }),
    );

    const request = new NextRequest("http://localhost/api/inbox/i1/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST_AI(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain("Too many requests");
  });

  it("returns 404 when inbox item is not found", async () => {
    mocks.analyzeInboxItemForUser.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/inbox/i1/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST_AI(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toBe("Inbox item not found");
  });

  it("returns 412 when OpenRouter is not configured", async () => {
    mocks.analyzeInboxItemForUser.mockRejectedValueOnce(
      new HttpError(412, "Настройте OpenRouter в Settings > API"),
    );

    const request = new NextRequest("http://localhost/api/inbox/i1/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST_AI(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(412);
    expect(payload.message).toBe("Настройте OpenRouter в Settings > API");
  });

  it("returns structured analysis payload on success", async () => {
    const request = new NextRequest("http://localhost/api/inbox/i1/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST_AI(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      itemId: "i1",
      summary: "Похоже на событие с датой.",
      recommendedTarget: "event",
      rationale: ["Есть временная привязка."],
      suggestedDate: "2026-03-10",
    });
  });
});
