import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  getJstMonthRange,
  getJstWeekRange,
  parseJstDateTime,
} from "@/lib/calendar/jst";
import { fetchEventsInRange, overlapsRange } from "@/lib/events/queries";

// 範囲は [start, end)。JST の日時文字列から作る
function jst(value: string) {
  const date = parseJstDateTime(value);
  if (!date) throw new Error(`テストデータが不正: ${value}`);
  return date;
}

function range(start: string, end: string) {
  return { start: jst(start), end: jst(end) };
}

function event(start: string, end: string) {
  return { startAt: jst(start), endAt: jst(end) };
}

// 10/23（JST）の 1 日
const day = range("2026-10-23T00:00", "2026-10-24T00:00");

describe("overlapsRange（範囲と重なるか）", () => {
  it("範囲の中に収まる予定は重なる", () => {
    expect(
      overlapsRange(event("2026-10-23T10:00", "2026-10-23T11:00"), day),
    ).toBe(true);
  });

  it("範囲の前から始まり、範囲の中で終わる予定は重なる", () => {
    expect(
      overlapsRange(event("2026-10-22T23:00", "2026-10-23T01:00"), day),
    ).toBe(true);
  });

  it("範囲の中で始まり、範囲の後で終わる予定は重なる", () => {
    expect(
      overlapsRange(event("2026-10-23T23:00", "2026-10-24T01:00"), day),
    ).toBe(true);
  });

  it("範囲全体をまたぐ予定は重なる", () => {
    expect(
      overlapsRange(event("2026-10-20T00:00", "2026-10-30T00:00"), day),
    ).toBe(true);
  });

  it("範囲の前で終わる予定は重ならない", () => {
    expect(
      overlapsRange(event("2026-10-22T10:00", "2026-10-22T11:00"), day),
    ).toBe(false);
  });

  it("範囲の後で始まる予定は重ならない", () => {
    expect(
      overlapsRange(event("2026-10-24T10:00", "2026-10-24T11:00"), day),
    ).toBe(false);
  });

  it("終了がちょうど範囲の開始なら重ならない（終了は含まない）", () => {
    expect(
      overlapsRange(event("2026-10-22T22:00", "2026-10-23T00:00"), day),
    ).toBe(false);
  });

  it("開始がちょうど範囲の終了なら重ならない（範囲の終了は含まない）", () => {
    expect(
      overlapsRange(event("2026-10-24T00:00", "2026-10-24T01:00"), day),
    ).toBe(false);
  });

  it("開始がちょうど範囲の開始なら重なる", () => {
    expect(
      overlapsRange(event("2026-10-23T00:00", "2026-10-23T01:00"), day),
    ).toBe(true);
  });

  it("長さ 0 の予定は、範囲の開始時刻なら重なり、終了時刻なら重ならない", () => {
    expect(
      overlapsRange(event("2026-10-23T00:00", "2026-10-23T00:00"), day),
    ).toBe(true);
    expect(
      overlapsRange(event("2026-10-23T12:00", "2026-10-23T12:00"), day),
    ).toBe(true);
    expect(
      overlapsRange(event("2026-10-24T00:00", "2026-10-24T00:00"), day),
    ).toBe(false);
    expect(
      overlapsRange(event("2026-10-22T23:59", "2026-10-22T23:59"), day),
    ).toBe(false);
  });

  it("月をまたぐ予定は、前の月にも次の月にも重なる", () => {
    // 10/31 23:00 〜 11/1 01:00（JST）
    const crossing = event("2026-10-31T23:00", "2026-11-01T01:00");
    const october = getJstMonthRange({ year: 2026, month: 10, day: 15 });
    const november = getJstMonthRange({ year: 2026, month: 11, day: 15 });
    const december = getJstMonthRange({ year: 2026, month: 12, day: 15 });

    expect(overlapsRange(crossing, october)).toBe(true);
    expect(overlapsRange(crossing, november)).toBe(true);
    expect(overlapsRange(crossing, december)).toBe(false);
  });

  it("週をまたぐ予定は、前の週にも次の週にも重なる", () => {
    // 10/24（土）23:00 〜 10/25（日）01:00
    const crossing = event("2026-10-24T23:00", "2026-10-25T01:00");
    const thisWeek = getJstWeekRange({ year: 2026, month: 10, day: 23 });
    const nextWeek = getJstWeekRange({ year: 2026, month: 10, day: 26 });

    expect(overlapsRange(crossing, thisWeek)).toBe(true);
    expect(overlapsRange(crossing, nextWeek)).toBe(true);
  });
});

// Supabase のクエリビルダーの代わり。呼ばれたメソッドと引数を記録し、最後に結果を返す
function fakeClient(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder = {
    then: (
      resolve: (value: typeof result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  } as Record<string, unknown>;

  for (const method of ["select", "lt", "or", "order"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }

  const client = {
    from: (...args: unknown[]) => {
      calls.push({ method: "from", args });
      return builder;
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

const row = {
  id: "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10",
  title: "打ち合わせ",
  description: null,
  startAt: "2026-10-23T01:00:00+00:00",
  endAt: "2026-10-23T02:00:00+00:00",
  allDay: false,
  createdAt: "2026-10-22T00:00:00+00:00",
  updatedAt: "2026-10-22T00:00:00+00:00",
};

describe("fetchEventsInRange", () => {
  it("範囲と重なる条件で events を問い合わせる", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    const start = jst("2026-10-23T00:00");
    const end = jst("2026-10-24T00:00");

    await fetchEventsInRange(client, { start, end });

    // 2026-10-22T15:00:00.000Z / 2026-10-23T15:00:00.000Z
    expect(calls).toEqual([
      { method: "from", args: ["events"] },
      { method: "select", args: ["*"] },
      { method: "lt", args: ["startAt", "2026-10-23T15:00:00.000Z"] },
      {
        method: "or",
        args: [
          "endAt.gt.2026-10-22T15:00:00.000Z,startAt.gte.2026-10-22T15:00:00.000Z",
        ],
      },
      { method: "order", args: ["startAt", { ascending: true }] },
      { method: "order", args: ["endAt", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
    ]);
  });

  it("取得した行を Date に変換した予定で返す", async () => {
    const { client } = fakeClient({ data: [row], error: null });

    const events = await fetchEventsInRange(client, day);

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("打ち合わせ");
    expect(events[0].startAt).toBeInstanceOf(Date);
    expect(events[0].startAt.toISOString()).toBe("2026-10-23T01:00:00.000Z");
  });

  it("該当なしなら空配列を返す", async () => {
    const { client } = fakeClient({ data: [], error: null });
    expect(await fetchEventsInRange(client, day)).toEqual([]);
  });

  it("Supabase のエラーは日本語のメッセージ付きで例外にする", async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: "boom" },
    });

    await expect(fetchEventsInRange(client, day)).rejects.toThrow(
      "予定の取得に失敗しました: boom",
    );
  });

  it("想定外の形式の行は例外にする", async () => {
    const { client } = fakeClient({
      data: [{ ...row, startAt: "invalid" }],
      error: null,
    });

    await expect(fetchEventsInRange(client, day)).rejects.toThrow();
  });
});
