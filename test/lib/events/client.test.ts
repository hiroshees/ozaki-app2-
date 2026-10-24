import { describe, expect, it, vi } from "vitest";
import { fetchEventsFromApi } from "@/lib/events/client";

const range = {
  start: new Date("2026-10-17T15:00:00Z"),
  end: new Date("2026-10-24T15:00:00Z"),
};

describe("fetchEventsFromApi", () => {
  it("範囲を ISO 8601 でクエリに付けて GET し、JSON をそのまま返す", async () => {
    const events = [
      { id: "a", title: "t", start: "x", end: "y", allDay: false },
    ];
    const fetchFn = vi.fn(async () => Response.json(events));

    expect(await fetchEventsFromApi(range, fetchFn)).toEqual(events);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/events?start=2026-10-17T15%3A00%3A00.000Z&end=2026-10-24T15%3A00%3A00.000Z",
      { cache: "no-store" },
    );
  });

  it("HTTP エラーは例外にする", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ error: "x" }, { status: 500 }),
    );

    await expect(fetchEventsFromApi(range, fetchFn)).rejects.toThrow(
      "HTTP 500",
    );
  });

  it("ネットワークエラーはそのまま投げる", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(fetchEventsFromApi(range, fetchFn)).rejects.toThrow(
      "Failed to fetch",
    );
  });
});
