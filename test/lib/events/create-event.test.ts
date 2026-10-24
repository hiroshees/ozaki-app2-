import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { parseJstDateTime } from "@/lib/calendar/jst";
import { createEvent, type EventWriter } from "@/lib/events/create-event";

function fakeDb() {
  const create = vi.fn(async (_args: Prisma.EventCreateArgs) => ({}));
  const db: EventWriter = { event: { create } };
  return { db, create };
}

const valid = {
  title: "会議",
  description: "週次",
  startAt: "2026-10-23T23:30",
  endAt: "2026-10-24T00:30",
  allDay: false,
};

describe("createEvent", () => {
  it("JST の入力を UTC の瞬間にして INSERT する（23:30 JST → 14:30 UTC）", async () => {
    const { db, create } = fakeDb();

    expect(await createEvent(db, valid)).toEqual({ ok: true });

    expect(create).toHaveBeenCalledTimes(1);
    const { data } = create.mock.calls[0][0];
    expect(data.title).toBe("会議");
    expect(data.description).toBe("週次");
    expect(data.allDay).toBe(false);
    expect((data.startAt as Date).toISOString()).toBe(
      "2026-10-23T14:30:00.000Z",
    );
    expect((data.endAt as Date).toISOString()).toBe("2026-10-23T15:30:00.000Z");
  });

  it("タイトルの前後の空白は取り除き、説明が空なら null にする", async () => {
    const { db, create } = fakeDb();
    await createEvent(db, { ...valid, title: "  会議  ", description: "  " });

    const { data } = create.mock.calls[0][0];
    expect(data.title).toBe("会議");
    expect(data.description).toBeNull();
  });

  it("終日の予定は JST 0:00 区切りで保存する", async () => {
    const { db, create } = fakeDb();
    await createEvent(db, {
      ...valid,
      allDay: true,
      startAt: "2026-10-23T00:00",
      endAt: "2026-10-24T00:00",
    });

    const { data } = create.mock.calls[0][0];
    expect(data.startAt).toEqual(parseJstDateTime("2026-10-23T00:00"));
    expect(data.endAt).toEqual(parseJstDateTime("2026-10-24T00:00"));
  });

  it("endAt < startAt は項目ごとの日本語エラーにし、DB は呼ばない", async () => {
    const { db, create } = fakeDb();
    const result = await createEvent(db, {
      ...valid,
      startAt: "2026-10-24T10:00",
      endAt: "2026-10-24T09:00",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { endAt: "終了日時は開始日時以降にしてください" },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("複数の項目のエラーをまとめて返す（項目ごとに最初の 1 件）", async () => {
    const { db, create } = fakeDb();
    const result = await createEvent(db, { ...valid, title: "", startAt: "" });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        title: "タイトルを入力してください",
        startAt: "開始日時を入力してください",
      },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("オブジェクトでない入力も、例外にせずエラーで返す", async () => {
    const { db, create } = fakeDb();
    for (const raw of [null, undefined, "x", 1]) {
      const result = await createEvent(db, raw);
      expect(result.ok).toBe(false);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("DB のエラーは、内部の詳細を出さず日本語のメッセージで返す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db: EventWriter = {
      event: {
        create: async () => {
          throw new Error("connection refused: secret-host");
        },
      },
    };

    expect(await createEvent(db, valid)).toEqual({
      ok: false,
      fieldErrors: {},
      message: "予定を保存できませんでした。時間をおいて再度お試しください。",
    });
  });
});
