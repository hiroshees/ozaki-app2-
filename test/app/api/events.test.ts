import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/db/prisma", () => ({ prisma: { event: { findMany } } }));

import { GET } from "@/app/api/events/route";

function request(query: string) {
  return new Request(`http://localhost/api/events${query}`);
}

const at = new Date("2026-01-01T00:00:00Z");

describe("GET /api/events", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("範囲と重なる予定を FullCalendar の形で返す", async () => {
    findMany.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "会議",
        description: null,
        startAt: new Date("2026-10-23T14:30:00Z"),
        endAt: new Date("2026-10-23T15:30:00Z"),
        allDay: false,
        createdAt: at,
        updatedAt: at,
      },
    ]);

    const response = await GET(
      request("?start=2026-10-17T15:00:00.000Z&end=2026-10-24T15:00:00.000Z"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "会議",
        description: null,
        allDay: false,
        start: "2026-10-23T14:30:00.000Z",
        end: "2026-10-23T15:30:00.000Z",
      },
    ]);
    expect(findMany.mock.calls[0][0].where.startAt).toEqual({
      lt: new Date("2026-10-24T15:00:00Z"),
    });
  });

  it.each([
    "",
    "?start=2026-10-17",
    "?start=2026-10-25T00:00:00Z&end=2026-10-24T00:00:00Z",
  ])(
    "不正なクエリ %s は 400 と日本語のメッセージを返し、DB を読まない",
    async (query) => {
      const response = await GET(request(query));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/[ぁ-ん]/);
      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it("DB のエラーは 500 と日本語のメッセージを返す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findMany.mockRejectedValue(new Error("db down"));

    const response = await GET(
      request("?start=2026-10-17T15:00:00Z&end=2026-10-24T15:00:00Z"),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "予定の取得に失敗しました",
    });
  });
});
