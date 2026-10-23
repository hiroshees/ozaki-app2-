import { describe, expect, it } from "vitest";
import { getJstMonthGridRange, parseJstDateTime } from "@/lib/calendar/jst";
import { groupEventsByDay, type DayEvent } from "@/lib/events/group";
import type { CalendarEvent } from "@/lib/events/schema";

function jst(value: string) {
  const date = parseJstDateTime(value);
  if (!date) throw new Error(`テストデータが不正: ${value}`);
  return date;
}

// 予定を作る。日時は JST の "YYYY-MM-DDTHH:mm"
function event(
  id: string,
  start: string,
  end: string,
  options: { title?: string; allDay?: boolean } = {},
): CalendarEvent {
  return {
    id,
    title: options.title ?? `予定${id}`,
    description: null,
    startAt: jst(start),
    endAt: jst(end),
    allDay: options.allDay ?? false,
    createdAt: jst("2026-01-01T00:00"),
    updatedAt: jst("2026-01-01T00:00"),
  };
}

// 予定のある日だけを「日付 → 予定の id」にして比べやすくする
function idsByDay(grouped: Record<string, DayEvent[]>) {
  return Object.fromEntries(
    Object.entries(grouped)
      .filter(([, events]) => events.length > 0)
      .map(([day, events]) => [day, events.map((e) => e.id)]),
  );
}

const OCT_GRID = getJstMonthGridRange({ year: 2026, month: 10, day: 15 }); // 9/27 〜 10/31
const NOV_GRID = getJstMonthGridRange({ year: 2026, month: 11, day: 15 }); // 11/1 〜 12/5
const SEP_GRID = getJstMonthGridRange({ year: 2026, month: 9, day: 15 }); // 8/30 〜 10/3

describe("groupEventsByDay", () => {
  it("範囲のすべての日をキーにし、予定のない日は空配列", () => {
    const grouped = groupEventsByDay([], OCT_GRID);
    const days = Object.keys(grouped);

    expect(days).toHaveLength(35);
    expect(days[0]).toBe("2026-09-27");
    expect(days[34]).toBe("2026-10-31");
    expect(Object.values(grouped).every((events) => events.length === 0)).toBe(
      true,
    );
  });

  it("1 日の予定は、その日だけに入る", () => {
    const grouped = groupEventsByDay(
      [event("a", "2026-10-23T10:00", "2026-10-23T11:00")],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({ "2026-10-23": ["a"] });
  });

  it("日の区切りは JST（JST 23:30 の予定は同じ日、0:30 は翌日）", () => {
    const grouped = groupEventsByDay(
      [
        event("late", "2026-10-23T23:00", "2026-10-23T23:30"),
        event("early", "2026-10-24T00:00", "2026-10-24T00:30"),
      ],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({
      "2026-10-23": ["late"],
      "2026-10-24": ["early"],
    });
  });

  it("月をまたぐ予定は、10 月の表示でも 11 月の表示でも見える", () => {
    const crossing = event("x", "2026-10-31T23:00", "2026-11-01T01:00");

    // 10 月の表示: 10/31 のセルに出る（グリッドは 10/31 まで）
    expect(idsByDay(groupEventsByDay([crossing], OCT_GRID))).toEqual({
      "2026-10-31": ["x"],
    });
    // 11 月の表示: 11/1 のセルに出る（グリッドは 11/1 から）
    expect(idsByDay(groupEventsByDay([crossing], NOV_GRID))).toEqual({
      "2026-11-01": ["x"],
    });
  });

  it("前後の月の日付が見えるグリッドでは、その日の予定も出る", () => {
    // 9 月の表示には 10/1〜10/3 が見える
    const grouped = groupEventsByDay(
      [event("n", "2026-10-02T10:00", "2026-10-02T11:00")],
      SEP_GRID,
    );
    expect(idsByDay(grouped)).toEqual({ "2026-10-02": ["n"] });
  });

  it("複数日にまたがる予定は、かかる日すべてに入る（範囲の外は含まない）", () => {
    // 10/29 10:00 〜 11/2 10:00 は、10 月の表示では 10/29〜10/31
    const grouped = groupEventsByDay(
      [event("m", "2026-10-29T10:00", "2026-11-02T10:00")],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({
      "2026-10-29": ["m"],
      "2026-10-30": ["m"],
      "2026-10-31": ["m"],
    });
  });

  it("翌日 0:00 ちょうどに終わる予定は、翌日には出ない", () => {
    const grouped = groupEventsByDay(
      [event("e", "2026-10-23T22:00", "2026-10-24T00:00")],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({ "2026-10-23": ["e"] });
  });

  it("終日の予定は、期間の日だけに入る（終了日の 0:00 は含まない）", () => {
    const grouped = groupEventsByDay(
      [
        event("one", "2026-10-10T00:00", "2026-10-11T00:00", { allDay: true }),
        event("three", "2026-10-23T00:00", "2026-10-26T00:00", {
          allDay: true,
        }),
      ],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({
      "2026-10-10": ["one"],
      "2026-10-23": ["three"],
      "2026-10-24": ["three"],
      "2026-10-25": ["three"],
    });
  });

  it("長さ 0 の予定は、その日に 1 回だけ入る", () => {
    const grouped = groupEventsByDay(
      [event("z", "2026-10-23T12:00", "2026-10-23T12:00")],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({ "2026-10-23": ["z"] });
  });

  it("範囲に重ならない予定は無視する", () => {
    const grouped = groupEventsByDay(
      [event("old", "2026-01-01T10:00", "2026-01-01T11:00")],
      OCT_GRID,
    );
    expect(idsByDay(grouped)).toEqual({});
  });

  it("同じ日の並びは、終日 → 開始が早い順 → 終了が早い順 → 入力順", () => {
    const grouped = groupEventsByDay(
      [
        event("t9", "2026-10-23T09:00", "2026-10-23T10:00"),
        event("t8-long", "2026-10-23T08:00", "2026-10-23T12:00"),
        event("all", "2026-10-23T00:00", "2026-10-24T00:00", { allDay: true }),
        event("t8-short", "2026-10-23T08:00", "2026-10-23T09:00"),
      ],
      OCT_GRID,
    );
    expect(grouped["2026-10-23"].map((e) => e.id)).toEqual([
      "all",
      "t8-short",
      "t8-long",
      "t9",
    ]);
  });

  it("画面に必要な項目（id・title・allDay）だけを返す", () => {
    const grouped = groupEventsByDay(
      [event("a", "2026-10-23T10:00", "2026-10-23T11:00", { title: "会議" })],
      OCT_GRID,
    );
    expect(grouped["2026-10-23"]).toEqual([
      { id: "a", title: "会議", allDay: false },
    ]);
  });
});
