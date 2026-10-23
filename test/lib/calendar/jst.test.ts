import { afterEach, describe, expect, it } from "vitest";
import {
  formatYmd,
  getJstDayRange,
  getJstMonthRange,
  getJstWeekRange,
  parseYmd,
  toJstYmd,
} from "@/lib/calendar/jst";

// 範囲は [start, end)（end は含まない）。比較しやすいよう ISO 文字列にする
function iso(range: { start: Date; end: Date }) {
  return [range.start.toISOString(), range.end.toISOString()];
}

describe("parseYmd", () => {
  it("YYYY-MM-DD を年・月・日に分解する", () => {
    expect(parseYmd("2026-10-23")).toEqual({ year: 2026, month: 10, day: 23 });
  });

  it("うるう年の 2/29 は有効、平年の 2/29 は null", () => {
    expect(parseYmd("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseYmd("2025-02-29")).toBeNull();
    // 100 で割り切れるが 400 で割り切れない年は平年
    expect(parseYmd("2100-02-29")).toBeNull();
    expect(parseYmd("2000-02-29")).not.toBeNull();
  });

  it("存在しない日付は null", () => {
    expect(parseYmd("2026-02-30")).toBeNull();
    expect(parseYmd("2026-04-31")).toBeNull();
    expect(parseYmd("2026-13-01")).toBeNull();
    expect(parseYmd("2026-00-10")).toBeNull();
    expect(parseYmd("2026-10-00")).toBeNull();
  });

  it("形式が違うものは null", () => {
    expect(parseYmd("2026-1-5")).toBeNull();
    expect(parseYmd("20261023")).toBeNull();
    expect(parseYmd("2026/10/23")).toBeNull();
    expect(parseYmd(" 2026-10-23")).toBeNull();
    expect(parseYmd("2026-10-23T00:00:00")).toBeNull();
    expect(parseYmd("abc")).toBeNull();
    expect(parseYmd("")).toBeNull();
  });

  it("未指定（undefined / null）は null", () => {
    expect(parseYmd(undefined)).toBeNull();
    expect(parseYmd(null)).toBeNull();
  });

  it("Date の仕様で 2 桁年に解釈される 1000 年未満は null", () => {
    expect(parseYmd("0099-01-01")).toBeNull();
  });
});

describe("formatYmd", () => {
  it("ゼロ埋めした YYYY-MM-DD にする", () => {
    expect(formatYmd({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
    expect(formatYmd({ year: 2026, month: 12, day: 31 })).toBe("2026-12-31");
  });

  it("parseYmd と往復できる", () => {
    const ymd = "2024-02-29";
    expect(formatYmd(parseYmd(ymd)!)).toBe(ymd);
  });
});

describe("toJstYmd", () => {
  it("UTC 14:30（JST 23:30）は同じ日", () => {
    expect(toJstYmd(new Date("2026-10-23T14:30:00Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 23,
    });
  });

  it("UTC 15:00（JST 翌日 00:00）から翌日になる", () => {
    expect(toJstYmd(new Date("2026-10-23T14:59:59.999Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 23,
    });
    expect(toJstYmd(new Date("2026-10-23T15:00:00.000Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 24,
    });
  });

  it("年またぎ: UTC 12/31 15:00 は JST の翌年 1/1", () => {
    expect(toJstYmd(new Date("2026-12-31T15:00:00Z"))).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });

  it("不正な Date は例外を投げる", () => {
    expect(() => toJstYmd(new Date("invalid"))).toThrow(RangeError);
  });
});

describe("getJstDayRange", () => {
  it("JST の 00:00 から翌 00:00（含まない）を UTC で返す", () => {
    expect(iso(getJstDayRange({ year: 2026, month: 10, day: 23 }))).toEqual([
      "2026-10-22T15:00:00.000Z",
      "2026-10-23T15:00:00.000Z",
    ]);
  });

  it("月末・年末でも翌日が正しく計算される", () => {
    expect(iso(getJstDayRange({ year: 2026, month: 10, day: 31 }))).toEqual([
      "2026-10-30T15:00:00.000Z",
      "2026-10-31T15:00:00.000Z",
    ]);
    expect(iso(getJstDayRange({ year: 2026, month: 12, day: 31 }))).toEqual([
      "2026-12-30T15:00:00.000Z",
      "2026-12-31T15:00:00.000Z",
    ]);
  });

  it("うるう日の翌日は 3/1", () => {
    expect(iso(getJstDayRange({ year: 2024, month: 2, day: 29 }))).toEqual([
      "2024-02-28T15:00:00.000Z",
      "2024-02-29T15:00:00.000Z",
    ]);
  });
});

describe("getJstWeekRange（日曜始まり）", () => {
  it("2026-10-23（金）の週は 10/18（日）〜 10/24（土）", () => {
    expect(iso(getJstWeekRange({ year: 2026, month: 10, day: 23 }))).toEqual([
      "2026-10-17T15:00:00.000Z", // JST 10/18 00:00
      "2026-10-24T15:00:00.000Z", // JST 10/25 00:00（含まない）
    ]);
  });

  it("日曜はその日から始まる", () => {
    expect(iso(getJstWeekRange({ year: 2026, month: 10, day: 18 }))).toEqual([
      "2026-10-17T15:00:00.000Z",
      "2026-10-24T15:00:00.000Z",
    ]);
  });

  it("土曜は同じ週の最後の日", () => {
    expect(iso(getJstWeekRange({ year: 2026, month: 10, day: 24 }))).toEqual([
      "2026-10-17T15:00:00.000Z",
      "2026-10-24T15:00:00.000Z",
    ]);
  });

  it("月またぎ・年またぎの週: 2026-12-31（木）は 12/27 〜 1/2", () => {
    expect(iso(getJstWeekRange({ year: 2026, month: 12, day: 31 }))).toEqual([
      "2026-12-26T15:00:00.000Z", // JST 12/27 00:00
      "2027-01-02T15:00:00.000Z", // JST 1/3 00:00（含まない）
    ]);
  });

  it("うるう年の月またぎ: 2024-03-01（金）は 2/25 〜 3/2", () => {
    expect(iso(getJstWeekRange({ year: 2024, month: 3, day: 1 }))).toEqual([
      "2024-02-24T15:00:00.000Z", // JST 2/25 00:00
      "2024-03-02T15:00:00.000Z", // JST 3/3 00:00（含まない）
    ]);
  });
});

describe("getJstMonthRange", () => {
  it("JST の月初 00:00 から翌月初 00:00（含まない）", () => {
    expect(iso(getJstMonthRange({ year: 2026, month: 10, day: 23 }))).toEqual([
      "2026-09-30T15:00:00.000Z", // JST 10/1 00:00
      "2026-10-31T15:00:00.000Z", // JST 11/1 00:00
    ]);
  });

  it("日が月末でも同じ範囲になる", () => {
    expect(iso(getJstMonthRange({ year: 2026, month: 10, day: 31 }))).toEqual(
      iso(getJstMonthRange({ year: 2026, month: 10, day: 1 })),
    );
  });

  it("12 月の翌月は翌年 1 月", () => {
    expect(iso(getJstMonthRange({ year: 2026, month: 12, day: 15 }))).toEqual([
      "2026-11-30T15:00:00.000Z", // JST 12/1 00:00
      "2026-12-31T15:00:00.000Z", // JST 2027/1/1 00:00
    ]);
  });

  it("2 月: うるう年は 29 日、平年は 28 日まで", () => {
    expect(iso(getJstMonthRange({ year: 2024, month: 2, day: 10 }))).toEqual([
      "2024-01-31T15:00:00.000Z",
      "2024-02-29T15:00:00.000Z", // JST 3/1 00:00（29 日分）
    ]);
    expect(iso(getJstMonthRange({ year: 2025, month: 2, day: 10 }))).toEqual([
      "2025-01-31T15:00:00.000Z",
      "2025-02-28T15:00:00.000Z", // JST 3/1 00:00（28 日分）
    ]);
  });
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

  // 日付の区切りが環境で変わりやすい境界時刻を含めて検証する
  function snapshot() {
    return {
      ymd: [
        "2026-10-23T14:59:59.999Z",
        "2026-10-23T15:00:00.000Z",
        "2026-12-31T15:00:00.000Z",
      ].map((s) => formatYmd(toJstYmd(new Date(s)))),
      day: iso(getJstDayRange({ year: 2026, month: 10, day: 23 })),
      week: iso(getJstWeekRange({ year: 2026, month: 10, day: 23 })),
      month: iso(getJstMonthRange({ year: 2026, month: 10, day: 23 })),
    };
  }

  it.each([
    "UTC",
    "Asia/Tokyo",
    "America/Los_Angeles",
    "Pacific/Kiritimati", // UTC+14
    "Pacific/Pago_Pago", // UTC-11
  ])("TZ=%s でも同じ結果になる", (tz) => {
    process.env.TZ = "UTC";
    const expected = snapshot();

    process.env.TZ = tz;
    // TZ の切り替えが実際に効いていることを確認する（効いていないと検証にならない）
    const offsetOfLocal = new Date("2026-01-15T00:00:00Z").getTimezoneOffset();
    expect(offsetOfLocal).toBe(
      {
        UTC: 0,
        "Asia/Tokyo": -540,
        "America/Los_Angeles": 480,
        "Pacific/Kiritimati": -840,
        "Pacific/Pago_Pago": 660,
      }[tz],
    );

    expect(snapshot()).toEqual(expected);
  });
});
