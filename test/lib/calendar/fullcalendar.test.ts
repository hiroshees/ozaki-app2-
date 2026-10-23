import { describe, expect, it } from "vitest";
import { parseJstDateTime } from "@/lib/calendar/jst";
import {
  FULLCALENDAR_VIEW_NAMES,
  pickUrlDate,
  toCalendarView,
} from "@/lib/calendar/fullcalendar";

function jst(value: string) {
  const date = parseJstDateTime(value);
  if (!date) throw new Error(`テストデータが不正: ${value}`);
  return date;
}

describe("FULLCALENDAR_VIEW_NAMES / toCalendarView", () => {
  it("URL の view と FullCalendar のビュー名を対応づける", () => {
    expect(FULLCALENDAR_VIEW_NAMES).toEqual({
      month: "dayGridMonth",
      week: "timeGridWeek",
      day: "timeGridDay",
    });
  });

  it("FullCalendar のビュー名から URL の view に戻せる", () => {
    expect(toCalendarView("dayGridMonth")).toBe("month");
    expect(toCalendarView("timeGridWeek")).toBe("week");
    expect(toCalendarView("timeGridDay")).toBe("day");
  });

  it("対応しないビュー名は null", () => {
    expect(toCalendarView("listWeek")).toBeNull();
    expect(toCalendarView("")).toBeNull();
  });
});

describe("pickUrlDate（URL に書く date を決める）", () => {
  // 2026 年 10 月の月ビュー: 現在の範囲は JST 10/1 0:00 〜 11/1 0:00（含まない）
  const octStart = jst("2026-10-01T00:00");
  const octEnd = jst("2026-11-01T00:00");

  it("今の date が表示中の範囲に入っていれば、そのまま維持する", () => {
    expect(
      pickUrlDate({ year: 2026, month: 10, day: 23 }, octStart, octEnd),
    ).toEqual({ year: 2026, month: 10, day: 23 });
  });

  it("範囲の最初の日・最後の日は範囲内", () => {
    expect(
      pickUrlDate({ year: 2026, month: 10, day: 1 }, octStart, octEnd),
    ).toEqual({ year: 2026, month: 10, day: 1 });
    expect(
      pickUrlDate({ year: 2026, month: 10, day: 31 }, octStart, octEnd),
    ).toEqual({ year: 2026, month: 10, day: 31 });
  });

  it("範囲の外なら、表示中の範囲の最初の日（JST）にする", () => {
    // 11 月へ移動した: 範囲は JST 11/1 〜 12/1
    expect(
      pickUrlDate(
        { year: 2026, month: 10, day: 23 },
        jst("2026-11-01T00:00"),
        jst("2026-12-01T00:00"),
      ),
    ).toEqual({ year: 2026, month: 11, day: 1 });
  });

  it("範囲の終了（含まない）の日は範囲の外", () => {
    expect(
      pickUrlDate({ year: 2026, month: 11, day: 1 }, octStart, octEnd),
    ).toEqual({ year: 2026, month: 10, day: 1 });
  });

  it("範囲の開始は UTC では前日になるが、JST の日付で返す", () => {
    // JST 11/1 0:00 は UTC では 10/31 15:00
    const start = jst("2026-11-01T00:00");
    expect(start.toISOString()).toBe("2026-10-31T15:00:00.000Z");
    expect(
      pickUrlDate(
        { year: 2026, month: 5, day: 5 },
        start,
        jst("2026-12-01T00:00"),
      ),
    ).toEqual({ year: 2026, month: 11, day: 1 });
  });

  it("週ビューでも使える（範囲は日曜〜土曜の 7 日）", () => {
    const weekStart = jst("2026-10-18T00:00");
    const weekEnd = jst("2026-10-25T00:00");
    expect(
      pickUrlDate({ year: 2026, month: 10, day: 20 }, weekStart, weekEnd),
    ).toEqual({ year: 2026, month: 10, day: 20 });
    expect(
      pickUrlDate({ year: 2026, month: 10, day: 30 }, weekStart, weekEnd),
    ).toEqual({ year: 2026, month: 10, day: 18 });
  });
});
