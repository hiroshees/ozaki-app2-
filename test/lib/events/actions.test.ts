import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const create = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
vi.mock("@/db/prisma", () => ({ prisma: { event: { create, update } } }));

import { createEventAction, updateEventAction } from "@/lib/events/actions";

describe("createEventAction", () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    update.mockResolvedValue({});
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

describe("updateEventAction", () => {
  const id = "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10";

  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue({});
  });

  it("Prisma で更新する", async () => {
    const result = await updateEventAction(id, {
      title: "会議",
      description: "",
      startAt: "2026-10-23T23:30",
      endAt: "2026-10-24T00:30",
      allDay: false,
    });

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("不正な入力では更新しない", async () => {
    const result = await updateEventAction(id, { title: "" });

    expect(result.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
