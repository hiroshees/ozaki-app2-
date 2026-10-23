import { describe, expect, it } from "vitest";
import {
  buildCalendarHref,
  resolveCalendarState,
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
