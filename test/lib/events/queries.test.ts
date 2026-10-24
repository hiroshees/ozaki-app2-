import { describe, expect, it } from "vitest";
import { parseJstDateTime } from "@/lib/calendar/jst";
import { overlapsRange } from "@/lib/events/queries";

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
    const october = range("2026-10-01T00:00", "2026-11-01T00:00");
    const november = range("2026-11-01T00:00", "2026-12-01T00:00");
    const december = range("2026-12-01T00:00", "2027-01-01T00:00");

    expect(overlapsRange(crossing, october)).toBe(true);
    expect(overlapsRange(crossing, november)).toBe(true);
    expect(overlapsRange(crossing, december)).toBe(false);
  });

  it("週をまたぐ予定は、前の週にも次の週にも重なる", () => {
    // 10/24（土）23:00 〜 10/25（日）01:00
    const crossing = event("2026-10-24T23:00", "2026-10-25T01:00");
    // 10/18（日）〜 10/24（土）の週と、10/25（日）〜 10/31（土）の週
    const thisWeek = range("2026-10-18T00:00", "2026-10-25T00:00");
    const nextWeek = range("2026-10-25T00:00", "2026-11-01T00:00");

    expect(overlapsRange(crossing, thisWeek)).toBe(true);
    expect(overlapsRange(crossing, nextWeek)).toBe(true);
  });
});
