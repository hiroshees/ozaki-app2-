import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { updateEvent, type EventUpdater } from "@/lib/events/update-event";

const ID = "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10";

function fakeDb(error?: unknown) {
  const update = vi.fn(async (_args: Prisma.EventUpdateArgs) => {
    if (error) throw error;
    return {};
  });
  const db: EventUpdater = { event: { update } };
  return { db, update };
}

const valid = {
  title: "会議",
  description: "週次",
  startAt: "2026-10-23T23:30",
  endAt: "2026-10-24T00:30",
  allDay: false,
};

describe("updateEvent", () => {
  it("検証した値で UPDATE する（JST → UTC）", async () => {
    const { db, update } = fakeDb();

    expect(await updateEvent(db, ID, valid)).toEqual({ ok: true });

    expect(update).toHaveBeenCalledTimes(1);
    const { where, data } = update.mock.calls[0][0];
    expect(where).toEqual({ id: ID });
    expect(data.title).toBe("会議");
    expect((data.startAt as Date).toISOString()).toBe(
      "2026-10-23T14:30:00.000Z",
    );
    expect((data.endAt as Date).toISOString()).toBe("2026-10-23T15:30:00.000Z");
  });

  it("endAt < startAt は項目ごとの日本語エラーにし、DB は呼ばない", async () => {
    const { db, update } = fakeDb();
    const result = await updateEvent(db, ID, {
      ...valid,
      startAt: "2026-10-24T10:00",
      endAt: "2026-10-24T09:00",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { endAt: "終了日時は開始日時以降にしてください" },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("id が UUID でなければ日本語のエラーにし、DB は呼ばない", async () => {
    const { db, update } = fakeDb();

    for (const id of ["", "abc", 123, null, undefined]) {
      const result = await updateEvent(db, id, valid);
      expect(result).toEqual({
        ok: false,
        fieldErrors: {},
        message: "予定が見つかりません。",
      });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("存在しない id（Prisma の P2025）は日本語のエラーにする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(
      Object.assign(new Error("Record to update not found."), {
        code: "P2025",
      }),
    );

    expect(await updateEvent(db, ID, valid)).toEqual({
      ok: false,
      fieldErrors: {},
      message: "予定が見つかりません。すでに削除された可能性があります。",
    });
  });

  it("その他の DB エラーは、詳細を出さず汎用のメッセージにする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(new Error("connection refused: secret-host"));

    expect(await updateEvent(db, ID, valid)).toEqual({
      ok: false,
      fieldErrors: {},
      message: "予定を保存できませんでした。時間をおいて再度お試しください。",
    });
  });
});
