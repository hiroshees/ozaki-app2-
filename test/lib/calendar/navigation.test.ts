import { describe, expect, it } from "vitest";
import {
  buildCalendarHref,
  formatCalendarTitle,
  resolveCalendarState,
  shiftCalendarDate,
} from "@/lib/calendar/navigation";

// JST 2026-10-23 23:30（UTC 14:30）
const NOW = new Date("2026-10-23T14:30:00Z");
const TODAY = { year: 2026, month: 10, day: 23 };

describe("resolveCalendarState", () => {
  it("view と date を解釈する", () => {
    expect(
      resolveCalendarState({ view: "week", date: "2026-03-05" }, NOW),
    ).toEqual({ view: "week", date: { year: 2026, month: 3, day: 5 } });
  });

  it("3 つの view をそれぞれ受け付ける", () => {
    for (const view of ["month", "week", "day"] as const) {
      expect(resolveCalendarState({ view }, NOW).view).toBe(view);
    }
  });

  it("未指定なら month と今日（JST）になる", () => {
    expect(resolveCalendarState({}, NOW)).toEqual({
      view: "month",
      date: TODAY,
    });
  });

  it("view が不正なら month にする", () => {
    for (const view of ["year", "", "MONTH", "Week", " day", "month "]) {
      expect(resolveCalendarState({ view, date: "2026-03-05" }, NOW)).toEqual({
        view: "month",
        date: { year: 2026, month: 3, day: 5 },
      });
    }
  });

  it("date が不正なら今日（JST）にする", () => {
    for (const date of [
      "2026-02-30",
      "2026-13-01",
      "2026-1-5",
      "20261023",
      "abc",
      "",
      "2026-10-23T10:00",
    ]) {
      expect(resolveCalendarState({ view: "day", date }, NOW)).toEqual({
        view: "day",
        date: TODAY,
      });
    }
  });

  it("今日は JST で決まる（UTC 15:00 を境に日付が変わる）", () => {
    expect(
      resolveCalendarState({}, new Date("2026-10-23T14:59:59.999Z")).date,
    ).toEqual({ year: 2026, month: 10, day: 23 });
    expect(
      resolveCalendarState({}, new Date("2026-10-23T15:00:00.000Z")).date,
    ).toEqual({ year: 2026, month: 10, day: 24 });
  });

  it("同じキーが複数あるときは最初の値を使う", () => {
    expect(
      resolveCalendarState(
        { view: ["week", "day"], date: ["2026-03-05", "2026-04-06"] },
        NOW,
      ),
    ).toEqual({ view: "week", date: { year: 2026, month: 3, day: 5 } });
  });

  it("空の配列は未指定として扱う", () => {
    expect(resolveCalendarState({ view: [], date: [] }, NOW)).toEqual({
      view: "month",
      date: TODAY,
    });
  });
});

describe("shiftCalendarDate（ビューに応じた単位で移動する）", () => {
  const date = { year: 2026, month: 10, day: 23 };

  it("日ビューは 1 日ずつ", () => {
    expect(shiftCalendarDate("day", date, 1)).toEqual({
      year: 2026,
      month: 10,
      day: 24,
    });
    expect(shiftCalendarDate("day", date, -1)).toEqual({
      year: 2026,
      month: 10,
      day: 22,
    });
  });

  it("週ビューは 7 日ずつ", () => {
    expect(shiftCalendarDate("week", date, 1)).toEqual({
      year: 2026,
      month: 10,
      day: 30,
    });
    expect(shiftCalendarDate("week", date, -1)).toEqual({
      year: 2026,
      month: 10,
      day: 16,
    });
  });

  it("月ビューは 1 か月ずつ", () => {
    expect(shiftCalendarDate("month", date, 1)).toEqual({
      year: 2026,
      month: 11,
      day: 23,
    });
    expect(shiftCalendarDate("month", date, -1)).toEqual({
      year: 2026,
      month: 9,
      day: 23,
    });
  });

  it("月末は移動先の月末に丸める（1/31 の次の月は 2/28）", () => {
    expect(
      shiftCalendarDate("month", { year: 2026, month: 1, day: 31 }, 1),
    ).toEqual({ year: 2026, month: 2, day: 28 });
    expect(
      shiftCalendarDate("month", { year: 2024, month: 1, day: 31 }, 1),
    ).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it("年をまたいで移動できる", () => {
    expect(
      shiftCalendarDate("month", { year: 2026, month: 12, day: 15 }, 1),
    ).toEqual({ year: 2027, month: 1, day: 15 });
    expect(
      shiftCalendarDate("week", { year: 2026, month: 12, day: 28 }, 1),
    ).toEqual({ year: 2027, month: 1, day: 4 });
    expect(
      shiftCalendarDate("day", { year: 2026, month: 1, day: 1 }, -1),
    ).toEqual({ year: 2025, month: 12, day: 31 });
  });

  it("前へ → 次へ で、日・週は元の日付に戻る", () => {
    for (const view of ["day", "week"] as const) {
      expect(
        shiftCalendarDate(view, shiftCalendarDate(view, date, -1), 1),
      ).toEqual(date);
    }
  });
});

describe("buildCalendarHref", () => {
  it("view と date を searchParams にする", () => {
    expect(buildCalendarHref("week", TODAY)).toBe(
      "/?view=week&date=2026-10-23",
    );
    expect(buildCalendarHref("month", { year: 2026, month: 1, day: 5 })).toBe(
      "/?view=month&date=2026-01-05",
    );
  });

  it("date を省略すると view だけにする（今日に戻るリンク用）", () => {
    expect(buildCalendarHref("day")).toBe("/?view=day");
  });

  it("作ったリンクを解釈すると元の状態に戻る", () => {
    const href = buildCalendarHref("week", TODAY);
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(resolveCalendarState(params, NOW)).toEqual({
      view: "week",
      date: TODAY,
    });
  });
});

describe("ビュー切替で date が維持される", () => {
  it("どのビューへ切り替えても、リンクの date は現在の date のまま", () => {
    const date = { year: 2026, month: 3, day: 5 };
    for (const view of ["month", "week", "day"] as const) {
      const href = buildCalendarHref(view, date);
      const params = Object.fromEntries(new URL(href, "http://x").searchParams);
      expect(resolveCalendarState(params, NOW)).toEqual({ view, date });
    }
  });
});

describe("formatCalendarTitle", () => {
  it("月ビューは「YYYY年M月」", () => {
    expect(formatCalendarTitle("month", TODAY)).toBe("2026年10月");
    expect(
      formatCalendarTitle("month", { year: 2026, month: 1, day: 31 }),
    ).toBe("2026年1月");
  });

  it("日ビューは日付と曜日", () => {
    expect(formatCalendarTitle("day", TODAY)).toBe("2026年10月23日（金）");
    expect(formatCalendarTitle("day", { year: 2026, month: 10, day: 18 })).toBe(
      "2026年10月18日（日）",
    );
  });

  it("週ビューは日曜〜土曜の範囲", () => {
    expect(formatCalendarTitle("week", TODAY)).toBe("2026年10月18日〜10月24日");
  });

  it("週ビューが月をまたぐときは終了側にも月を付ける", () => {
    // 2026-09-30（水）の週は 9/27（日）〜 10/3（土）
    expect(formatCalendarTitle("week", { year: 2026, month: 9, day: 30 })).toBe(
      "2026年9月27日〜10月3日",
    );
    // 月内に収まる週は終了側にも月を付ける（同じ月でも省略しない）
    expect(
      formatCalendarTitle("week", { year: 2026, month: 10, day: 27 }),
    ).toBe("2026年10月25日〜10月31日");
  });

  it("週ビューが年をまたぐときは終了側にも年を付ける", () => {
    expect(
      formatCalendarTitle("week", { year: 2026, month: 12, day: 31 }),
    ).toBe("2026年12月27日〜2027年1月2日");
  });
});
