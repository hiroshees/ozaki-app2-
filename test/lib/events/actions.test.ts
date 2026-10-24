import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const create = vi.hoisted(() => vi.fn());
vi.mock("@/db/prisma", () => ({ prisma: { event: { create } } }));

import { createEventAction } from "@/lib/events/actions";

describe("createEventAction", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({});
  });

  it("Prisma で保存する", async () => {
    const result = await createEventAction({
      title: "会議",
      description: "",
      startAt: "2026-10-23T23:30",
      endAt: "2026-10-24T00:30",
      allDay: false,
    });

    expect(result).toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("不正な入力では保存しない", async () => {
    const result = await createEventAction({ title: "" });

    expect(result.ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
