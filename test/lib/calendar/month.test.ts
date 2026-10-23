import { afterEach, describe, expect, it } from "vitest";
import { formatYmd } from "@/lib/calendar/jst";
import {
  formatHiddenCount,
  fromLocalDate,
  MAX_VISIBLE_EVENTS,
  summarizeDay,
  toLocalDate,
} from "@/lib/calendar/month";

describe("summarizeDay（最大 3 件、超過は「+N 件」）", () => {
  const make = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: String(i) }));

  it("表示の上限は 3 件", () => {
    expect(MAX_VISIBLE_EVENTS).toBe(3);
  });

  it("0 件", () => {
    expect(summarizeDay([])).toEqual({ visible: [], hiddenCount: 0 });
  });

  it("3 件まではすべて表示し、超過なし", () => {
    const events = make(3);
    expect(summarizeDay(events)).toEqual({ visible: events, hiddenCount: 0 });
  });

  it("4 件なら先頭 3 件を表示し、残り 1 件", () => {
    const events = make(4);
    expect(summarizeDay(events)).toEqual({
      visible: events.slice(0, 3),
      hiddenCount: 1,
    });
  });

  it("10 件なら先頭 3 件を表示し、残り 7 件", () => {
    const result = summarizeDay(make(10));
    expect(result.visible).toHaveLength(3);
    expect(result.hiddenCount).toBe(7);
  });

  it("上限を指定できる", () => {
    expect(summarizeDay(make(5), 1)).toEqual({
      visible: make(5).slice(0, 1),
      hiddenCount: 4,
    });
  });
});

describe("formatHiddenCount", () => {
  it("「+N 件」にする", () => {
    expect(formatHiddenCount(1)).toBe("+1 件");
    expect(formatHiddenCount(12)).toBe("+12 件");
  });
});

describe("react-calendar との日付変換（ブラウザのローカル 0:00 の Date ⇔ 日付）", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  // react-calendar はタイルの日付を「ローカル 0:00 の Date」で渡す。
  // UTC+14 や UTC-11 でも、見えているカレンダーの日付と一致しなければならない
  it.each([
    "UTC",
    "Asia/Tokyo",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
    "Pacific/Pago_Pago",
  ])("TZ=%s でもカレンダー上の日付と一致する", (tz) => {
    process.env.TZ = tz;

    const tile = new Date(2026, 9, 23); // ローカル 2026-10-23 0:00
    expect(fromLocalDate(tile)).toEqual({ year: 2026, month: 10, day: 23 });

    // 同じ日の遅い時刻でも同じ日
    expect(fromLocalDate(new Date(2026, 9, 23, 23, 59, 59))).toEqual({
      year: 2026,
      month: 10,
      day: 23,
    });

    // 往復できる。toLocalDate はローカル 0:00 を返す
    const back = toLocalDate({ year: 2026, month: 10, day: 23 });
    expect([back.getFullYear(), back.getMonth(), back.getDate()]).toEqual([
      2026, 9, 23,
    ]);
    expect([back.getHours(), back.getMinutes()]).toEqual([0, 0]);
    expect(formatYmd(fromLocalDate(back))).toBe("2026-10-23");
  });
});
