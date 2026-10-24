import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseJstDateTime } from "@/lib/calendar/jst";
import {
  buildOverlapWhere,
  EventsQuerySchema,
  findEventsInRange,
  MAX_RANGE_DAYS,
  type EventReader,
} from "@/lib/events/find-events";
import { overlapsRange } from "@/lib/events/queries";
import type { CalendarEvent } from "@/lib/events/schema";

function jst(value: string) {
  const date = parseJstDateTime(value);
  if (!date) throw new Error(`テストデータが不正: ${value}`);
  return date;
}

function range(start: string, end: string) {
  return { start: jst(start), end: jst(end) };
}

function row(
  id: string,
  start: string,
  end: string,
  title = id,
): CalendarEvent {
  const at = jst("2026-01-01T00:00");
  return {
    id,
    title,
    description: null,
    startAt: jst(start),
    endAt: jst(end),
    allDay: false,
    createdAt: at,
    updatedAt: at,
  };
}

// buildOverlapWhere が作る形（startAt < end かつ（endAt > start または startAt >= start））だけを
// 解釈する簡易な where 評価。Prisma のかわりに where を実際に適用して、取得条件を検証する
type DateFilter = { lt?: Date; gt?: Date; gte?: Date };
function matches(event: CalendarEvent, where: Prisma.EventWhereInput): boolean {
  const test = (value: Date, filter: DateFilter) =>
    (filter.lt === undefined || value < filter.lt) &&
    (filter.gt === undefined || value > filter.gt) &&
    (filter.gte === undefined || value >= filter.gte);

  const startOk = test(event.startAt, where.startAt as DateFilter);
  const orOk = (where.OR as Prisma.EventWhereInput[]).some(
    (cond) =>
      (cond.endAt !== undefined &&
        test(event.endAt, cond.endAt as DateFilter)) ||
      (cond.startAt !== undefined &&
        test(event.startAt, cond.startAt as DateFilter)),
  );
  return startOk && orOk;
}

function fakeDb(rows: CalendarEvent[]) {
  const calls: Prisma.EventFindManyArgs[] = [];
  const db: EventReader = {
    event: {
      async findMany(args) {
        calls.push(args);
        return rows.filter((event) => matches(event, args.where ?? {}));
      },
    },
  };
  return { db, calls };
}

const day = range("2026-10-23T00:00", "2026-10-24T00:00");

describe("buildOverlapWhere / findEventsInRange（取得条件）", () => {
  const cases: [string, CalendarEvent, boolean][] = [
    ["範囲の中", row("a", "2026-10-23T10:00", "2026-10-23T11:00"), true],
    [
      "前から始まり範囲の中で終わる",
      row("b", "2026-10-22T23:00", "2026-10-23T01:00"),
      true,
    ],
    [
      "範囲の中で始まり後で終わる",
      row("c", "2026-10-23T23:00", "2026-10-24T01:00"),
      true,
    ],
    [
      "範囲全体をまたぐ",
      row("d", "2026-10-20T00:00", "2026-10-30T00:00"),
      true,
    ],
    [
      "範囲の前で終わる",
      row("e", "2026-10-22T10:00", "2026-10-22T11:00"),
      false,
    ],
    [
      "範囲の後で始まる",
      row("f", "2026-10-24T10:00", "2026-10-24T11:00"),
      false,
    ],
    [
      "終了がちょうど範囲の開始",
      row("g", "2026-10-22T22:00", "2026-10-23T00:00"),
      false,
    ],
    [
      "開始がちょうど範囲の終了",
      row("h", "2026-10-24T00:00", "2026-10-24T01:00"),
      false,
    ],
    [
      "開始がちょうど範囲の開始",
      row("i", "2026-10-23T00:00", "2026-10-23T01:00"),
      true,
    ],
    [
      "長さ 0・範囲の開始時刻",
      row("j", "2026-10-23T00:00", "2026-10-23T00:00"),
      true,
    ],
    [
      "長さ 0・範囲の終了時刻",
      row("k", "2026-10-24T00:00", "2026-10-24T00:00"),
      false,
    ],
    [
      "長さ 0・範囲の中",
      row("l", "2026-10-23T12:00", "2026-10-23T12:00"),
      true,
    ],
    [
      "長さ 0・範囲の前",
      row("m", "2026-10-22T12:00", "2026-10-22T12:00"),
      false,
    ],
  ];

  it.each(cases)("%s", async (_name, event, expected) => {
    const { db } = fakeDb([event]);
    const found = await findEventsInRange(db, day);

    expect(found.length === 1).toBe(expected);
    // overlapsRange（画面側の判定）と同じ結果になる
    expect(overlapsRange(event, day)).toBe(expected);
  });

  it("月をまたぐ予定は、前後どちらの月でも取得できる", async () => {
    const spanning = row("s", "2026-10-31T20:00", "2026-11-01T02:00");
    const { db } = fakeDb([spanning]);

    const october = range("2026-10-01T00:00", "2026-11-01T00:00");
    const november = range("2026-11-01T00:00", "2026-12-01T00:00");
    expect(await findEventsInRange(db, october)).toEqual([spanning]);
    expect(await findEventsInRange(db, november)).toEqual([spanning]);
  });

  it("週をまたぐ予定は、前後どちらの週でも取得できる", async () => {
    // 10/24（土）夜から 10/25（日）朝
    const spanning = row("w", "2026-10-24T22:00", "2026-10-25T08:00");
    const { db } = fakeDb([spanning]);

    const week1 = range("2026-10-18T00:00", "2026-10-25T00:00");
    const week2 = range("2026-10-25T00:00", "2026-11-01T00:00");
    expect(await findEventsInRange(db, week1)).toEqual([spanning]);
    expect(await findEventsInRange(db, week2)).toEqual([spanning]);
  });

  it("startAt、endAt、id の順に並べるよう指定する", async () => {
    const { db, calls } = fakeDb([]);
    await findEventsInRange(db, day);

    expect(calls[0].orderBy).toEqual([
      { startAt: "asc" },
      { endAt: "asc" },
      { id: "asc" },
    ]);
    expect(calls[0].where).toEqual(buildOverlapWhere(day));
  });
});

describe("EventsQuerySchema（GET /api/events のクエリ）", () => {
  function parse(query: Record<string, unknown>) {
    return EventsQuerySchema.safeParse(query);
  }
  function messages(query: Record<string, unknown>) {
    const result = parse(query);
    return result.success ? [] : result.error.issues.map((i) => i.message);
  }

  it("ISO 8601 の start / end を Date にする（オフセット付きも可）", () => {
    const result = parse({
      start: "2026-10-18T00:00:00+09:00",
      end: "2026-10-25T00:00:00.000Z",
    });
    expect(result.success && result.data).toEqual({
      start: new Date("2026-10-17T15:00:00Z"),
      end: new Date("2026-10-25T00:00:00Z"),
    });
  });

  it("未指定は日本語のメッセージでエラーにする", () => {
    expect(messages({})).toEqual([
      "startを指定してください",
      "endを指定してください",
    ]);
  });

  it("日時の形式が違うとエラーにする", () => {
    for (const start of ["2026-10-18", "abc", "", "2026-10-18T00:00:00"]) {
      expect(messages({ start, end: "2026-10-25T00:00:00Z" })).toEqual([
        "startは ISO 8601 の日時で指定してください",
      ]);
    }
  });

  it("start >= end はエラーにする（同時刻も不可）", () => {
    const same = "2026-10-18T00:00:00Z";
    expect(messages({ start: same, end: same })).toEqual([
      "end は start より後にしてください",
    ]);
    expect(messages({ start: "2026-10-19T00:00:00Z", end: same })).toEqual([
      "end は start より後にしてください",
    ]);
  });

  it(`範囲は ${MAX_RANGE_DAYS} 日まで`, () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const at = (days: number) =>
      new Date(start.getTime() + days * 86_400_000).toISOString();

    expect(
      parse({ start: start.toISOString(), end: at(MAX_RANGE_DAYS) }).success,
    ).toBe(true);
    expect(
      messages({ start: start.toISOString(), end: at(MAX_RANGE_DAYS + 1) }),
    ).toEqual([`範囲は ${MAX_RANGE_DAYS} 日以内にしてください`]);
  });
});
