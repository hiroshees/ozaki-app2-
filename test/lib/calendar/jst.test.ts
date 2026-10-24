import { afterEach, describe, expect, it } from "vitest";
import {
  formatJstDateTime,
  formatYmd,
  getJstDayRange,
  parseJstDateTime,
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

describe("parseJstDateTime", () => {
  it("JST の YYYY-MM-DDTHH:mm を UTC の Date にする", () => {
    // JST 23:30 は UTC 14:30
    expect(parseJstDateTime("2026-10-23T23:30")?.toISOString()).toBe(
      "2026-10-23T14:30:00.000Z",
    );
  });

  it("JST 0:00 は前日の UTC 15:00", () => {
    expect(parseJstDateTime("2026-10-24T00:00")?.toISOString()).toBe(
      "2026-10-23T15:00:00.000Z",
    );
  });

  it("月末・年末・うるう日でも正しい瞬間になる", () => {
    expect(parseJstDateTime("2026-12-31T23:59")?.toISOString()).toBe(
      "2026-12-31T14:59:00.000Z",
    );
    expect(parseJstDateTime("2024-02-29T08:00")?.toISOString()).toBe(
      "2024-02-28T23:00:00.000Z",
    );
  });

  it("存在しない日付・時刻は null", () => {
    expect(parseJstDateTime("2026-02-30T10:00")).toBeNull();
    expect(parseJstDateTime("2026-10-23T24:00")).toBeNull();
    expect(parseJstDateTime("2026-10-23T10:60")).toBeNull();
    expect(parseJstDateTime("2026-10-23T-1:00")).toBeNull();
  });

  it("形式が違うものは null（タイムゾーン付き・秒付き・日付のみを含む）", () => {
    expect(parseJstDateTime("2026-10-23")).toBeNull();
    expect(parseJstDateTime("2026-10-23 10:00")).toBeNull();
    expect(parseJstDateTime("2026-10-23T10:00:00")).toBeNull();
    expect(parseJstDateTime("2026-10-23T10:00Z")).toBeNull();
    expect(parseJstDateTime("2026-10-23T10:00+09:00")).toBeNull();
    expect(parseJstDateTime("2026-10-23T1:00")).toBeNull();
    expect(parseJstDateTime("")).toBeNull();
    expect(parseJstDateTime(undefined)).toBeNull();
    expect(parseJstDateTime(null)).toBeNull();
  });
});

describe("formatJstDateTime", () => {
  it("瞬間を JST の YYYY-MM-DDTHH:mm にする", () => {
    expect(formatJstDateTime(new Date("2026-10-23T14:30:00Z"))).toBe(
      "2026-10-23T23:30",
    );
    expect(formatJstDateTime(new Date("2026-10-23T15:00:00Z"))).toBe(
      "2026-10-24T00:00",
    );
  });

  it("parseJstDateTime と往復できる（秒以下は切り捨て）", () => {
    const value = "2024-02-29T08:05";
    expect(formatJstDateTime(parseJstDateTime(value)!)).toBe(value);
    expect(formatJstDateTime(new Date("2026-10-23T14:30:59.999Z"))).toBe(
      "2026-10-23T23:30",
    );
  });

  it("不正な Date は例外を投げる", () => {
    expect(() => formatJstDateTime(new Date("invalid"))).toThrow(RangeError);
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
      parsed: ["2026-10-23T23:30", "2026-10-24T00:00"].map((s) =>
        parseJstDateTime(s)?.toISOString(),
      ),
      day: iso(getJstDayRange({ year: 2026, month: 10, day: 23 })),
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
