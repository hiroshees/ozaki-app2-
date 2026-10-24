import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { deleteEvent, type EventDeleter } from "@/lib/events/delete-event";

const ID = "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10";

function fakeDb(error?: unknown) {
  const del = vi.fn(async (_args: Prisma.EventDeleteArgs) => {
    if (error) throw error;
    return {};
  });
  const db: EventDeleter = { event: { delete: del } };
  return { db, del };
}

describe("deleteEvent", () => {
  it("id を指定して DELETE する", async () => {
    const { db, del } = fakeDb();

    expect(await deleteEvent(db, ID)).toEqual({ ok: true });
    expect(del).toHaveBeenCalledTimes(1);
    expect(del.mock.calls[0][0]).toEqual({ where: { id: ID } });
  });

  it("id が UUID でなければ日本語のエラーにし、DB は呼ばない", async () => {
    const { db, del } = fakeDb();

    for (const id of ["", "abc", 123, null, undefined, "x' OR '1'='1"]) {
      expect(await deleteEvent(db, id)).toEqual({
        ok: false,
        fieldErrors: {},
        message: "予定が見つかりません。",
      });
    }
    expect(del).not.toHaveBeenCalled();
  });

  it("存在しない id（Prisma の P2025）は日本語のエラーにする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(
      Object.assign(new Error("Record to delete does not exist."), {
        code: "P2025",
      }),
    );

    expect(await deleteEvent(db, ID)).toEqual({
      ok: false,
      fieldErrors: {},
      message: "予定が見つかりません。すでに削除された可能性があります。",
    });
  });

  it("その他の DB エラーは、詳細を出さず汎用のメッセージにする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(new Error("connection refused: secret-host"));

    expect(await deleteEvent(db, ID)).toEqual({
      ok: false,
      fieldErrors: {},
      message: "予定を削除できませんでした。時間をおいて再度お試しください。",
    });
  });
});
