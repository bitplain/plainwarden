import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth", () => ({
  getUserIdFromRequest: vi.fn(() => "u1"),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  getRateLimitResponse: vi.fn(async () => null),
}));

vi.mock("@/lib/server/inbox-db", () => ({
  listInboxItemsForUser: vi.fn(async () => [{ id: "i1" }]),
  createInboxItemForUser: vi.fn(async () => ({ id: "i2", content: "Новая" })),
  archiveInboxItemForUser: vi.fn(async () => ({ id: "i1", status: "archived" })),
  convertInboxItemForUser: vi.fn(async () => ({
    item: { id: "i1", status: "processed" },
    converted: { type: "task", id: "t1" },
  })),
}));

import { GET as GET_INBOX, POST as POST_INBOX } from "@/app/api/inbox/route";
import { POST as POST_ARCHIVE } from "@/app/api/inbox/[id]/archive/route";
import { POST as POST_CONVERT } from "@/app/api/inbox/[id]/convert/route";

describe("inbox routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/inbox returns list", async () => {
    const request = new NextRequest("http://localhost/api/inbox?status=new");
    const response = await GET_INBOX(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ items: [{ id: "i1" }] });
  });

  it("POST /api/inbox creates item", async () => {
    const request = new NextRequest("http://localhost/api/inbox", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Новая", typeHint: "task" }),
    });

    const response = await POST_INBOX(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.id).toBe("i2");
  });

  it("POST /api/inbox/:id/archive archives item", async () => {
    const request = new NextRequest("http://localhost/api/inbox/i1/archive", {
      method: "POST",
    });

    const response = await POST_ARCHIVE(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("archived");
  });

  it("POST /api/inbox/:id/convert converts item", async () => {
    const request = new NextRequest("http://localhost/api/inbox/i1/convert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "task" }),
    });

    const response = await POST_CONVERT(request, {
      params: Promise.resolve({ id: "i1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.converted.id).toBe("t1");
  });
});
