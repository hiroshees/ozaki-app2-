import { afterEach, describe, expect, it } from "vitest";
import { parseJstDateTime } from "@/lib/calendar/jst";
import { toFullCalendarEvent } from "@/lib/events/fullcalendar";
import type { CalendarEvent } from "@/lib/events/schema";

function jst(value: string) {
  const date = parseJstDateTime(value);
  if (!date) throw new Error(`テストデータが不正: ${value}`);
  return date;
}

function event(
  start: string,
  end: string,
  options: { allDay?: boolean; title?: string } = {},
): CalendarEvent {
  return {
    id: "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10",
    title: options.title ?? "打ち合わせ",
    description: "メモ",
    startAt: jst(start),
    endAt: jst(end),
    allDay: options.allDay ?? false,
    createdAt: jst("2026-01-01T00:00"),
    updatedAt: jst("2026-01-01T00:00"),
  };
}

describe("toFullCalendarEvent", () => {
  it("時刻つきの予定は、開始・終了を ISO 8601（UTC）の文字列にする", () => {
    // JST 23:30 は UTC 14:30
    expect(
      toFullCalendarEvent(event("2026-10-23T23:30", "2026-10-24T00:30")),
    ).toEqual({
      id: "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10",
      title: "打ち合わせ",
      start: "2026-10-23T14:30:00.000Z",
      end: "2026-10-23T15:30:00.000Z",
      allDay: false,
    });
  });

  it("終日の予定は、JST の日付（YYYY-MM-DD）にする。終了は含まない日付", () => {
    // JST 10/23 0:00 〜 10/24 0:00（1 日） → 10/23 〜 10/24（含まない）
    expect(
      toFullCalendarEvent(
        event("2026-10-23T00:00", "2026-10-24T00:00", { allDay: true }),
      ),
    ).toMatchObject({ start: "2026-10-23", end: "2026-10-24", allDay: true });
  });

  it("複数日の終日の予定", () => {
    expect(
      toFullCalendarEvent(
        event("2026-10-30T00:00", "2026-11-02T00:00", { allDay: true }),
      ),
    ).toMatchObject({ start: "2026-10-30", end: "2026-11-02", allDay: true });
  });

  it("終日の日付は、UTC では前日になる JST 0:00 でも JST の日付になる", () => {
    // JST 0:00 は UTC では前日の 15:00。UTC の日付を使うと 10/22 になってしまう
    const result = toFullCalendarEvent(
      event("2026-10-23T00:00", "2026-10-24T00:00", { allDay: true }),
    );
    expect(result.start).toBe("2026-10-23");
  });

  it("説明などの余分な項目は渡さない（画面に必要な項目だけ）", () => {
    const result = toFullCalendarEvent(
      event("2026-10-23T10:00", "2026-10-23T11:00"),
    );
    expect(Object.keys(result).sort()).toEqual([
      "allDay",
      "end",
      "id",
      "start",
      "title",
    ]);
  });

  describe("実行環境のタイムゾーンに依存しない", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    });

    it.each([
      "UTC",
      "Asia/Tokyo",
      "America/Los_Angeles",
      "Pacific/Kiritimati",
      "Pacific/Pago_Pago",
    ])("TZ=%s でも同じ結果になる", (tz) => {
      process.env.TZ = tz;
      const timed = toFullCalendarEvent(
        event("2026-10-23T23:30", "2026-10-24T00:30"),
      );
      const allDay = toFullCalendarEvent(
        event("2026-10-23T00:00", "2026-10-24T00:00", { allDay: true }),
      );

      expect(timed.start).toBe("2026-10-23T14:30:00.000Z");
      expect(allDay.start).toBe("2026-10-23");
      expect(allDay.end).toBe("2026-10-24");
    });
  });
});
